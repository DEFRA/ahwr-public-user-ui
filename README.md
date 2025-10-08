# AHWR Public User UI

AHWR Public User UI service, which contains the user dashboard as well as both the apply and claim user journeys.

## Prerequisites

- Docker
- Docker Compose

## Running the application

The application is designed to run in containerised environments, using Docker Compose in development and Kubernetes in production.

### Start

Use the start script inside the /scripts folder.

```
./scripts/start
```

### Running tests

A convenience script is provided to run automated tests in a containerised
environment. This will rebuild images before running tests via docker-compose,
using a combination of `docker-compose.yaml` and `docker-compose.test.yaml`.
The command given to `docker-compose run` may be customised by passing
arguments to the test script.

Examples:

```
# Run tests locally (moves your .env so it does not interfere)
scripts/testlocal

# Run tests in pipeline
scripts/test

# Run tests with file watch
scripts/test -w
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable information providers in the public sector to license the use and re-use of their information under a common open licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
