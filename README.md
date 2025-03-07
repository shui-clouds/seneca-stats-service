# Seneca Stats Service

A service for tracking and retrieving user study statistics for courses.

### Prerequisites

[Node.js + NPM](https://nodejs.org/) (Node v20 is used for local development and lambda runtime)

Tools used:
- [SST](https://sst.dev) is used to set up and deploy the necessary AWS resources.

> AWS credentials (profile or ENV) must be configured before deploying or starting dev.


### Schema

The database schema consists of:
- `users` - User information
- `courses` - Course information
- `sessions` - Study session data including modules studied, scores, and time spent

### Database Migrations

Currently using AWS RDS database with Drizzle ORM.

Install dependencies: `npm i`

Before starting dev server, apply migrations: `npm run db migrate`

### Development


> By running this, SST will automatically deploy the necessary infrastructure on AWS to run the app, including a VPC, Lambda function, RDS.

Start the development server: `npm run dev`

This will also:

1. Start the API in ["live"](https://sst.dev/docs/live/) mode
2. Watch for changes and hot reload

Since the database cluster is in a VPC, run: `sudo npx sst tunnel install`.
This allows us to connect to our db from local machine.

> Alternatively, you can run `npx sst deploy` to deploy the code to Lambda, and hit the API without running in "live" mode.

To view your database with Drizzle Studio:
go to `https://local.drizzle.studio/`


### API Endpoints

- `POST /courses/:courseId` - Record a new study session
- `GET /courses/:courseId` - Get aggregated stats for a course with the user ID specified
- `GET /courses/:courseId/sessions/:sessionId` - Get details for a specific session if exists

### Testing

Run tests with: `npm run test`


### NOTES:
- As there are no authentication requirements specified, current validation only checks if user ID exists in the header and is a UUID.
- The average score from `GET /courses/:courseId` returns a decimal with no rounding, as no specific format is mentioned.