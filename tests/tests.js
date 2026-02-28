process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongod;

beforeAll(async () => {
  jest.setTimeout(120000); // 2 min for first-time MongoDB binary download
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  app = require('../app');
  await new Promise((resolve) => mongoose.connection.once('connected', resolve));
}, 120000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('User Registration', () => {
  it('should register a new user and return user without password', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'testuser', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.username).toBe('testuser');
    expect(res.body).not.toHaveProperty('password');
  });

  it('should return 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 409 when username is already taken', async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'duplicate', password: 'password123' });
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'duplicate', password: 'otherpass' });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('taken');
  });

  it('should return 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ username: 'shortpass', password: '12345' });
    expect(res.status).toBe(400);
  });
});

describe('User Login', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'loginuser', password: 'password123' });
  });

  it('should login and return token and user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'loginuser', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.username).toBe('loginuser');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('should return 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'loginuser', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 401 with non-existent user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'nonexistent', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

describe('Dog Registration', () => {
  let tok;

  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'dogowner', password: 'password123' });
    const login = await request(app)
      .post('/api/login')
      .send({ username: 'dogowner', password: 'password123' });
    tok = login.body.token;
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/dogs')
      .send({ name: 'Rex', description: 'Friendly dog' });
    expect(res.status).toBe(401);
  });

  it('should register a dog with valid auth', async () => {
    const res = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${tok}`)
      .send({ name: 'Rex', description: 'Friendly dog' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.name).toBe('Rex');
    expect(res.body.description).toBe('Friendly dog');
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${tok}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
  });
});

describe('Dog Adoption', () => {
  let adoptTok;
  let id;

  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'dogowner2', password: 'password123' });
    await request(app)
      .post('/api/register')
      .send({ username: 'adopter', password: 'password123' });
    const owner = await request(app)
      .post('/api/login')
      .send({ username: 'dogowner2', password: 'password123' });
    const adopter = await request(app)
      .post('/api/login')
      .send({ username: 'adopter', password: 'password123' });
    adoptTok = adopter.body.token;
    const d = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${owner.body.token}`)
      .send({ name: 'Buddy', description: 'Needs a home' });
    id = d.body._id;
  });

  it('should adopt a dog with valid auth and thank-you message', async () => {
    const res = await request(app)
      .post(`/api/dogs/${id}/adopt`)
      .set('Authorization', `Bearer ${adoptTok}`)
      .send({ thankYouMessage: 'Thank you!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('adoptedBy');
    expect(res.body.thankYouMessage).toBe('Thank you!');
  });

  it('should return 400 when trying to adopt already adopted dog', async () => {
    const res = await request(app)
      .post(`/api/dogs/${id}/adopt`)
      .set('Authorization', `Bearer ${adoptTok}`)
      .send({ thankYouMessage: 'Again' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already been adopted');
  });
});

describe('Dog Adoption - Cannot adopt own dog', () => {
  let tok;
  let id;

  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'soloowner', password: 'password123' });
    const login = await request(app)
      .post('/api/login')
      .send({ username: 'soloowner', password: 'password123' });
    tok = login.body.token;
    const d = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${tok}`)
      .send({ name: 'MyDog', description: 'My own dog' });
    id = d.body._id;
  });

  it('should return 400 when owner tries to adopt own dog', async () => {
    const res = await request(app)
      .post(`/api/dogs/${id}/adopt`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ thankYouMessage: 'Self adopt' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('cannot adopt');
  });
});

describe('Removing Dogs', () => {
  let ownerTok;
  let otherTok;
  let availId;
  let adoptId;

  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'removeowner', password: 'password123' });
    await request(app)
      .post('/api/register')
      .send({ username: 'otherperson', password: 'password123' });
    const owner = await request(app)
      .post('/api/login')
      .send({ username: 'removeowner', password: 'password123' });
    const other = await request(app)
      .post('/api/login')
      .send({ username: 'otherperson', password: 'password123' });
    ownerTok = owner.body.token;
    otherTok = other.body.token;
    const d1 = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${ownerTok}`)
      .send({ name: 'AvailableDog', description: 'Can remove' });
    availId = d1.body._id;
    const d2 = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${ownerTok}`)
      .send({ name: 'AdoptedDog', description: 'Will be adopted' });
    adoptId = d2.body._id;
    await request(app)
      .post(`/api/dogs/${adoptId}/adopt`)
      .set('Authorization', `Bearer ${otherTok}`)
      .send({ thankYouMessage: 'Thanks!' });
  });

  it('should remove dog when owner and dog is available', async () => {
    const res = await request(app)
      .delete(`/api/dogs/${availId}`)
      .set('Authorization', `Bearer ${ownerTok}`);
    expect(res.status).toBe(200);
  });

  it('should return 403 when non-owner tries to remove dog', async () => {
    const d = await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${ownerTok}`)
      .send({ name: 'OnlyMine', description: 'Mine' });
    const res = await request(app)
      .delete(`/api/dogs/${d.body._id}`)
      .set('Authorization', `Bearer ${otherTok}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('only remove dogs you registered');
  });

  it('should return 400 when trying to remove adopted dog', async () => {
    const res = await request(app)
      .delete(`/api/dogs/${adoptId}`)
      .set('Authorization', `Bearer ${ownerTok}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('adopted');
  });
});

describe('Listing Registered Dogs', () => {
  let tok;

  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'listowner', password: 'password123' });
    const login = await request(app)
      .post('/api/login')
      .send({ username: 'listowner', password: 'password123' });
    tok = login.body.token;
    await request(app)
      .post('/api/dogs')
      .set('Authorization', `Bearer ${tok}`)
      .send({ name: 'Dog1', description: 'First' });
  });

  it('should return registered dogs with pagination', async () => {
    const res = await request(app)
      .get('/api/dogs/registered')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dogs');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
    expect(Array.isArray(res.body.dogs)).toBe(true);
  });

  it('should filter by status=available', async () => {
    const res = await request(app)
      .get('/api/dogs/registered?status=available')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.dogs)).toBe(true);
  });
});

describe('Listing Adopted Dogs', () => {
  let tok;

  beforeAll(async () => {
    await request(app)
      .post('/api/register')
      .send({ username: 'adopterlister', password: 'password123' });
    const login = await request(app)
      .post('/api/login')
      .send({ username: 'adopterlister', password: 'password123' });
    tok = login.body.token;
  });

  it('should return adopted dogs with pagination', async () => {
    const res = await request(app)
      .get('/api/dogs/adopted')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dogs');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.dogs)).toBe(true);
  });
});
