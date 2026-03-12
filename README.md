# Usage

- set up a local mongodb instance for testing
`docker run --name local-mongo -p 27017:27017 -d mongo:latest`

- run the api server -- this will export the MONGO_URI automatically
`npm run dev`

- NOTE: nodemon -L required for refresh on wsl

# ETC

- test the mongo connection
`mongosh "mongodb://localhost:27017" --eval "db.adminCommand('ping')"`
- set the MONGO_URI env variable
`export MONGO_URI=mongodb://localhost:27017/dog-api`

# Testing

- see queries.text for example queries
- run the test suite
`npm test`

---------


The folder structure designed by our software architects ensures adherence to best practices:

- `controllers`: Contains the logic for handling incoming requests and returning responses to the client.
- `models`: Defines the data models and interacts directly with the database.
- `routes`: Manages the routes of your API, directing requests to the appropriate controller.
- `middlewares`: Houses custom middleware functions, including authentication and rate limiting.
- `.env`: Stores environment variables, such as database connection strings and the JWT secret.
- `app.js`: The main entry point of your application, where you configure the Express app and connect all the pieces.
- `db.js`: Manages the database connection.
- `package.json`: Keeps track of npm packages and scripts necessary for your project.

This structure provides a solid foundation for building a well-organized, scalable backend service. By separating concerns into dedicated directories and files, your project remains clean, navigable, and easier to debug and extend.

View the rubric for this assessment [here](https://storage.googleapis.com/hatchways.appspot.com/employers/springboard/student_rubrics/Dog%20Adoption%20Platform%20Rubric.pdf)
