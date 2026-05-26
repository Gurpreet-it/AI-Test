# Simple Java REST Assured Framework (PICEPot)

This project is a lightweight API automation framework using Java, REST Assured, TestNG, and Maven.

## Project Structure

```plaintext
APIAutomation/
├── pom.xml
├── testng.xml
├── README.md
├── src/
│   └── test/
│       ├── java/
│       │   ├── base/
│       │   │   └── BaseTest.java
│       │   ├── payloads/
│       │   │   └── PayloadData.java
│       │   ├── tests/
│       │   │   └── UserAPITest.java
│       │   └── utils/
│       │       └── APIUtils.java
│       └── resources/
│           └── config.properties
```

## PICEPot Mapping

- Portable: Maven-based, environment override through system/env variables.
- Isolated: Fresh request specification is created for every API call and tests are independent.
- Configurable: Base URL, base path, and API key in `config.properties`.
- Extensible: Utility-first package design supports adding new APIs and features.
- Practical/Organized/Testable: Beginner-friendly, compact, and easy to maintain.

## Configuration

`src/test/resources/config.properties`

```properties
base.url=https://reqres.in
api.base.path=/api
api.key=
```

You can override values for CI/CD:

- `-Dbase.url=https://reqres.in`
- `-Dapi.base.path=/api`
- `-Dapi.key=<your_real_reqres_key>`
- `BASE_URL` and `REQRES_API_KEY` environment variables are also supported

## Run Tests

```bash
mvn test
```

## Test Coverage

- GET `/users/2`
- POST `/users`
- PUT `/users/2`
- DELETE `/users/2`

## Sample Console Output (trimmed)

```text
Request method:	GET
Request URI:	https://reqres.in/api/users/2
HTTP/1.1 200 OK

Request method:	POST
Request URI:	https://reqres.in/api/users
HTTP/1.1 201 Created

Request method:	PUT
Request URI:	https://reqres.in/api/users/2
HTTP/1.1 200 OK

Request method:	DELETE
Request URI:	https://reqres.in/api/users/2
HTTP/1.1 204 No Content

Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
```

If no valid API key is configured, tests are skipped with a clear message instead of failing.

## Future Enhancements

- Add Allure reporting
- Add POJO model classes
- Add OAuth2 and token refresh flows
- Add TestNG DataProviders
- Add GitHub Actions workflow
- Add multi-environment profile strategy
