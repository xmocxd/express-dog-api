const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongod;

// default password used across tests
const DEFAULT_PASSWORD = 'password123';

// wait for mongoose to report connected before any tests run
async function waitForMongoConnected() {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > 15000) {
      throw new Error('Timed out waiting for MongoDB connection');
    }
    // small sleep in a loop until mongo is ready
    await new Promise((r) => setTimeout(r, 50));
  }
}

// build a bearer auth header object for supertest set
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// register a user and return the api response body
async function registerUser(username, password = DEFAULT_PASSWORD) {
  const res = await request(app).post('/api/register').send({ username, password }).expect(201);
  return res.body;
}

// login a user and return token and safe user payload
async function loginUser(username, password = DEFAULT_PASSWORD) {
  const res = await request(app).post('/api/login').send({ username, password }).expect(200);
  return { token: res.body.token, user: res.body.user };
}

// common test setup to get a valid token quickly
async function registerAndLogin(username, password = DEFAULT_PASSWORD) {
  await registerUser(username, password);
  return loginUser(username, password);
}

// create a dog as the authenticated user
async function createDog(token, payload) {
  const res = await request(app).post('/api/dogs').set(authHeader(token)).send(payload).expect(201);
  return res.body;
}

// adopt a dog as the authenticated user
async function adoptDog(token, dogId, payload = {}) {
  const res = await request(app)
    .post(`/api/dogs/${dogId}/adopt`)
    .set(authHeader(token))
    .send(payload)
    .expect(200);
  return res.body;
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';

  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();

  // app connects on import using mongo uri but does not listen in test env
  app = require('../app');

  await waitForMongoConnected();
});

afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
  } catch {}
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  // isolate tests by clearing all collections between cases
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

describe('API basics (JSON, CORS, health)', () => {
  test('GET /api returns OK and has CORS headers', async () => {
    const res = await request(app).get('/api/').expect(200);
    expect(res.text).toMatch(/express-dog-api test route/i);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  test('parses JSON payloads (register user)', async () => {
    const body = await registerUser('Alice', DEFAULT_PASSWORD);

    expect(body).toHaveProperty('_id');
    expect(body).toHaveProperty('username', 'alice');
    expect(body).not.toHaveProperty('password');
  });
});

describe('Users (registration + authentication)', () => {
  test('register hashes password in DB (never returned by API)', async () => {
    await registerUser('bob', DEFAULT_PASSWORD);

    // verify stored password is bcrypt hash and never plain text
    const User = mongoose.model('User');
    const u = await User.findOne({ username: 'bob' }).lean();
    expect(u).toBeTruthy();
    expect(u.password).toBeTruthy();
    expect(u.password).not.toBe(DEFAULT_PASSWORD);
    expect(u.password).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
  });

  test('duplicate usernames are rejected', async () => {
    await registerUser('dup', DEFAULT_PASSWORD);

    const res = await request(app)
      .post('/api/register')
      .send({ username: 'dup', password: DEFAULT_PASSWORD })
      .expect(409);
    expect(res.body.message).toMatch(/taken/i);
  });

  test('login returns token valid for ~24h and safe user object', async () => {
    await registerUser('carol', DEFAULT_PASSWORD);
    const res = await request(app).post('/api/login').send({ username: 'carol', password: DEFAULT_PASSWORD }).expect(200);

    // verify the response body has the expected properties
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body).toHaveProperty('user._id');
    expect(res.body).toHaveProperty('user.username', 'carol');
    expect(res.body.user).not.toHaveProperty('password');

    // decode jwt to assert it contains user id and has about a 24h lifetime
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('userId');
    // jwt exp and iat are seconds
    const lifetime = decoded.exp - decoded.iat;
    expect(lifetime).toBeGreaterThanOrEqual(23 * 60 * 60);
    expect(lifetime).toBeLessThanOrEqual(24 * 60 * 60 + 5);
  });

  test('login rejects invalid credentials', async () => {
    // register a user and then try to login with wrong credentials

    await registerUser('dave', DEFAULT_PASSWORD);

    // try to login with wrong password
    await request(app).post('/api/login').send({ username: 'dave', password: 'wrongpass' }).expect(401);
    // try to login with wrong username
    await request(app).post('/api/login').send({ username: 'nope', password: DEFAULT_PASSWORD }).expect(401);
  });
});

describe('Auth middleware', () => {
  test('rejects missing token and invalid token', async () => {
    // try to get auth-test without a token
    await request(app).get('/api/auth-test').expect(401);
    await request(app).get('/api/auth-test').set({ Authorization: 'Bearer not-a-real-token' }).expect(401);
  });

  test('accepts valid token', async () => {
    // register a user and then try to get auth-test with a valid token
    const { token } = await registerAndLogin('eve');
    await request(app).get('/api/auth-test').set(authHeader(token)).expect(200);
  });
});

describe('Dogs (register, adopt, remove, list)', () => {
  test('register dog requires auth and creates dog for owner', async () => {
    await request(app).post('/api/dogs').send({ name: 'Rex', description: 'Good boy' }).expect(401);

    const { token, user } = await registerAndLogin('owner1');
    const dog = await createDog(token, { name: 'Rex', description: 'Good boy' });

    // verify the response body has the expected properties
    expect(dog).toHaveProperty('_id');
    expect(dog).toHaveProperty('name', 'Rex');
    expect(dog).toHaveProperty('description', 'Good boy');
    expect(String(dog.registeredBy)).toBe(String(user._id));
    expect(dog.adoptedBy).toBeNull();
  });

  test('adopt dog: cannot adopt own dog; can adopt others; cannot adopt twice', async () => {
    const { token: ownerToken } = await registerAndLogin('owner2');
    const dog = await createDog(ownerToken, { name: 'Buddy', description: 'Friendly' });

    // owner cannot adopt their own dog
    const ownAdopt = await request(app)
      .post(`/api/dogs/${dog._id}/adopt`)
      .set(authHeader(ownerToken))
      .send({ thankYouMessage: 'Thanks me' })
      .expect(400);
    expect(ownAdopt.body.message).toMatch(/cannot adopt/i);

    // another user can adopt
    const { token: adopterToken, user: adopter } = await registerAndLogin('adopter1');
    const adoptedDog = await adoptDog(adopterToken, dog._id, { thankYouMessage: 'Thank you!' });

    expect(String(adoptedDog.adoptedBy)).toBe(String(adopter._id));
    expect(adoptedDog.thankYouMessage).toBe('Thank you!');
    expect(adoptedDog.adoptedAt).toBeTruthy();

    // cannot adopt again once adopted
    const second = await request(app)
      .post(`/api/dogs/${dog._id}/adopt`)
      .set(authHeader(adopterToken))
      .send({ thankYouMessage: 'again' })
      .expect(400);
    expect(second.body.message).toMatch(/already been adopted/i);
  });

  test('remove dog: only owner; cannot remove adopted; invalid/nonexistent ids handled', async () => {
    const { token: ownerToken } = await registerAndLogin('owner3');
    const { token: otherToken } = await registerAndLogin('other3');

    const dog = await createDog(ownerToken, { name: 'Milo', description: 'Calm' });

    // only the registering owner can remove a dog
    const forbidden = await request(app)
      .delete(`/api/dogs/${dog._id}`)
      .set(authHeader(otherToken))
      .expect(403);
    expect(forbidden.body.message).toMatch(/only remove/i);

    // invalid id should be treated as bad request
    await request(app).delete('/api/dogs/not-an-id').set(authHeader(ownerToken)).expect(400);

    // nonexistent id should be not found
    const nonexistentId = new mongoose.Types.ObjectId().toString();
    await request(app).delete(`/api/dogs/${nonexistentId}`).set(authHeader(ownerToken)).expect(404);

    // adopted dogs cannot be removed even by the owner
    await adoptDog(otherToken, dog._id, { thankYouMessage: 'ty' });

    const adoptedRemove = await request(app)
      .delete(`/api/dogs/${dog._id}`)
      .set(authHeader(ownerToken))
      .expect(400);
    expect(adoptedRemove.body.message).toMatch(/adopted/i);
  });

  test('list registered dogs supports status filter and pagination', async () => {
    const { token: ownerToken } = await registerAndLogin('owner4');
    const { token: adopterToken } = await registerAndLogin('adopter4');

    // create three dogs owned by the same user
    const d1 = await createDog(ownerToken, { name: 'A' });
    const d2 = await createDog(ownerToken, { name: 'B' });
    const d3 = await createDog(ownerToken, { name: 'C' });

    // adopt one of them so we can test filtering
    await adoptDog(adopterToken, d2._id, { thankYouMessage: 'ty' });

    // default list is all registered dogs
    const all = await request(app).get('/api/dogs/registered').set(authHeader(ownerToken)).expect(200);
    expect(all.body).toHaveProperty('dogs');
    expect(all.body).toHaveProperty('pagination');
    expect(all.body.pagination).toMatchObject({ page: 1, limit: 10 });
    expect(all.body.pagination.total).toBe(3);

    // filter available means not adopted
    const avail = await request(app)
      .get('/api/dogs/registered?status=available')
      .set(authHeader(ownerToken))
      .expect(200);
    expect(avail.body.pagination.total).toBe(2);
    expect(avail.body.dogs.every((d) => d.adoptedBy === null)).toBe(true);

    // filter adopted means adopted by someone
    const adopted = await request(app)
      .get('/api/dogs/registered?status=adopted')
      .set(authHeader(ownerToken))
      .expect(200);
    expect(adopted.body.pagination.total).toBe(1);
    expect(adopted.body.dogs[0].adoptedBy).toBeTruthy();

    // pagination should split results across pages
    const page1 = await request(app)
      .get('/api/dogs/registered?page=1&limit=2')
      .set(authHeader(ownerToken))
      .expect(200);
    const page2 = await request(app)
      .get('/api/dogs/registered?page=2&limit=2')
      .set(authHeader(ownerToken))
      .expect(200);

    expect(page1.body.dogs).toHaveLength(2);
    expect(page2.body.dogs).toHaveLength(1);

    const ids = new Set([...page1.body.dogs, ...page2.body.dogs].map((d) => String(d._id)));
    expect(ids.size).toBe(3);
    expect(ids.has(String(d1._id))).toBe(true);
    expect(ids.has(String(d2._id))).toBe(true);
    expect(ids.has(String(d3._id))).toBe(true);
  });

  test('list adopted dogs paginates and only includes adopted-by-user', async () => {
    const { token: ownerToken } = await registerAndLogin('owner5');
    const { token: adopter1Token } = await registerAndLogin('adopter5a');
    const { token: adopter2Token } = await registerAndLogin('adopter5b');

    const dogs = [];
    for (const name of ['D1', 'D2', 'D3']) {
      // sequential create keeps ids stable and easy to reason about
      // eslint-disable-next-line no-await-in-loop
      const d = await createDog(ownerToken, { name });
      dogs.push(d);
    }

    // adopter1 adopts two dogs and adopter2 adopts one dog
    await adoptDog(adopter1Token, dogs[0]._id);
    await adoptDog(adopter1Token, dogs[1]._id);
    await adoptDog(adopter2Token, dogs[2]._id);

    const res1 = await request(app)
      .get('/api/dogs/adopted?page=1&limit=1')
      .set(authHeader(adopter1Token))
      .expect(200);
    expect(res1.body.pagination.total).toBe(2);
    expect(res1.body.dogs).toHaveLength(1);

    const res2 = await request(app)
      .get('/api/dogs/adopted?page=2&limit=1')
      .set(authHeader(adopter1Token))
      .expect(200);
    expect(res2.body.dogs).toHaveLength(1);

    const ids = new Set([String(res1.body.dogs[0]._id), String(res2.body.dogs[0]._id)]);
    expect(ids.size).toBe(2);
  });
});
