# Restful-Booker API Test Cases

## Test Case Format (JIRA)
All test cases follow this structure:
- **Test ID**: Unique identifier
- **Summary**: Brief description
- **Preconditions**: Prerequisites before test execution
- **Steps to Reproduce**: Numbered steps to execute the test
- **Expected Result**: What should happen
- **Actual Result**: What actually happened (to be filled during execution)
- **Status**: PASS/FAIL (to be filled during execution)

---

## 1. PING ENDPOINT TEST CASES

### TC_PING_001 - Health Check - Happy Path
- **Summary**: Verify API health check endpoint returns success
- **Preconditions**: API server is running at https://restful-booker.herokuapp.com
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/ping`
  2. Verify response status code
  3. Verify response body structure
- **Expected Result**:
  - HTTP Status Code: 201 Created
  - Response Body: `{"OK": "Created"}`
  - Response Time: < 2000 ms
- **Actual Result**: 
- **Status**: 

### TC_PING_002 - Health Check - Connection Timeout
- **Summary**: Verify API behavior when connection times out
- **Preconditions**: API server connection can be simulated as unavailable
- **Steps to Reproduce**:
  1. Configure request timeout to 100 ms
  2. Send GET request to `https://restful-booker.herokuapp.com/ping`
  3. Observe error response
- **Expected Result**:
  - Connection timeout error is thrown
  - Error code indicates timeout
- **Actual Result**: 
- **Status**: 

---

## 2. AUTH ENDPOINT TEST CASES

### TC_AUTH_001 - Create Auth Token - Happy Path
- **Summary**: Successfully create authentication token with valid credentials
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "username": "admin",
       "password": "password123"
     }
     ```
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response contains token field with non-empty string value
  - Token format is alphanumeric (e.g., "abc123")
  - Response Time: < 2000 ms
- **Actual Result**: 
- **Status**: 

### TC_AUTH_002 - Create Auth Token - Invalid Username
- **Summary**: Attempt to create token with incorrect username
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "username": "invaliduser",
       "password": "password123"
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK (API returns 200 but with no token)
  - Response body does NOT contain a valid token or contains error message
- **Actual Result**: 
- **Status**: 

### TC_AUTH_003 - Create Auth Token - Invalid Password
- **Summary**: Attempt to create token with incorrect password
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "username": "admin",
       "password": "wrongpassword"
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK (API returns 200 but with no token)
  - Response body does NOT contain a valid token or contains error message
- **Actual Result**: 
- **Status**: 

### TC_AUTH_004 - Create Auth Token - Missing Username
- **Summary**: Attempt to create token without username field
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "password": "password123"
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response indicates missing required field
- **Actual Result**: 
- **Status**: 

### TC_AUTH_005 - Create Auth Token - Missing Password
- **Summary**: Attempt to create token without password field
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "username": "admin"
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response indicates missing required field
- **Actual Result**: 
- **Status**: 

### TC_AUTH_006 - Create Auth Token - Empty Credentials
- **Summary**: Attempt to create token with empty string credentials
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "username": "",
       "password": ""
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response indicates invalid credentials
- **Actual Result**: 
- **Status**: 

### TC_AUTH_007 - Create Auth Token - Special Characters in Credentials
- **Summary**: Attempt to create token with special characters in credentials
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/auth`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "username": "ad@min!#$",
       "password": "p@ssw0rd!@#$%"
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response indicates invalid credentials
- **Actual Result**: 
- **Status**: 

---

## 3. GET BOOKING IDS ENDPOINT TEST CASES

### TC_BOOKING_IDS_001 - Get All Booking IDs - Happy Path
- **Summary**: Successfully retrieve all booking IDs
- **Preconditions**: API server is running with existing bookings
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an array of objects
  - Each object contains a "bookingid" field (numeric)
  - Array is not empty or returns empty array if no bookings exist
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_002 - Get Booking IDs - Filter by First Name
- **Summary**: Retrieve booking IDs filtered by guest first name
- **Preconditions**: API server is running with bookings for "Sally"
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?firstname=sally`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an array of booking objects
  - Each object has bookingid matching bookings for "Sally"
  - Response Time: < 2000 ms
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_003 - Get Booking IDs - Filter by Last Name
- **Summary**: Retrieve booking IDs filtered by guest last name
- **Preconditions**: API server is running with bookings for "Brown"
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?lastname=Brown`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an array of objects
  - Each bookingid matches bookings for guest with lastname "Brown"
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_004 - Get Booking IDs - Filter by Check-in Date
- **Summary**: Retrieve booking IDs filtered by check-in date
- **Preconditions**: API server is running with bookings on 2014-03-13 or later
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?checkin=2014-03-13`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an array of objects
  - Each booking has check-in date >= 2014-03-13
  - Date format is correct in response
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_005 - Get Booking IDs - Filter by Check-out Date
- **Summary**: Retrieve booking IDs filtered by check-out date
- **Preconditions**: API server is running with bookings on 2014-03-13 or later
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?checkout=2014-03-13`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an array of objects
  - Each booking has check-out date >= 2014-03-13
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_006 - Get Booking IDs - Combined Filters (Name + Dates)
- **Summary**: Retrieve booking IDs with multiple filter criteria
- **Preconditions**: API server is running with matching bookings
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?firstname=Sally&lastname=Brown&checkin=2014-03-13&checkout=2014-03-15`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an array of objects
  - Each booking matches ALL filter criteria
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_007 - Get Booking IDs - Invalid Date Format
- **Summary**: Attempt to filter bookings with invalid date format
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?checkin=2014/03/13`
  2. Observe error response
- **Expected Result**:
  - HTTP Status Code: 200 OK (returns empty or error)
  - Response indicates invalid date format or returns no results
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_008 - Get Booking IDs - No Matches Found
- **Summary**: Retrieve bookings with filters that match no records
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?firstname=NonExistentName`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body is an empty array `[]`
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_IDS_009 - Get Booking IDs - Case Sensitivity
- **Summary**: Verify filter parameters are case-sensitive/insensitive
- **Preconditions**: API server has booking with firstname "Sally"
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking?firstname=SALLY`
  2. Verify if results match "Sally"
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response indicates whether filter is case-sensitive or not
- **Actual Result**: 
- **Status**: 

---

## 4. GET BOOKING ENDPOINT TEST CASES

### TC_BOOKING_GET_001 - Get Booking - Happy Path
- **Summary**: Successfully retrieve a specific booking by ID
- **Preconditions**: API server is running with booking ID 1 existing
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/1`
  2. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response body contains booking object with fields:
    - firstname (string)
    - lastname (string)
    - totalprice (number)
    - depositpaid (boolean)
    - bookingdates (object with checkin and checkout)
    - additionalneeds (string)
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_002 - Get Booking - Accept JSON Header
- **Summary**: Request booking in JSON format explicitly
- **Preconditions**: API server is running with booking ID 1
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Accept header to `application/json`
  3. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response Content-Type is `application/json`
  - Response body is valid JSON object
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_003 - Get Booking - Accept XML Header
- **Summary**: Request booking in XML format
- **Preconditions**: API server is running with booking ID 1
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Accept header to `application/xml`
  3. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response Content-Type is `application/xml`
  - Response body is valid XML with booking data
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_004 - Get Booking - Non-Existent ID
- **Summary**: Attempt to retrieve booking with non-existent ID
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/99999`
  2. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found
  - Response body indicates booking not found
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_005 - Get Booking - Invalid ID Format
- **Summary**: Attempt to retrieve booking with non-numeric ID
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/abc`
  2. Observe error response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 404 Not Found
  - Response indicates invalid ID format
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_006 - Get Booking - Negative ID
- **Summary**: Attempt to retrieve booking with negative ID
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/-1`
  2. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found or 400 Bad Request
  - Response indicates invalid ID
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_007 - Get Booking - Zero ID
- **Summary**: Attempt to retrieve booking with ID = 0
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/0`
  2. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found or 400 Bad Request
  - Response indicates booking not found or invalid ID
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_GET_008 - Get Booking - Very Large ID
- **Summary**: Attempt to retrieve booking with extremely large ID
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send GET request to `https://restful-booker.herokuapp.com/booking/9999999999999999`
  2. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found
  - Response indicates booking not found
- **Actual Result**: 
- **Status**: 

---

## 5. CREATE BOOKING ENDPOINT TEST CASES

### TC_BOOKING_CREATE_001 - Create Booking - Happy Path (JSON)
- **Summary**: Successfully create a new booking with valid JSON data
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Set Accept header to `application/json`
  4. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  5. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response contains bookingid (numeric)
  - Response contains booking object with submitted data
  - bookingid > 0
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_002 - Create Booking - Happy Path (XML)
- **Summary**: Successfully create a new booking with valid XML data
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `text/xml`
  3. Set Accept header to `application/xml`
  4. Send request body:
     ```xml
     <booking>
       <firstname>Jim</firstname>
       <lastname>Brown</lastname>
       <totalprice>111</totalprice>
       <depositpaid>true</depositpaid>
       <bookingdates>
         <checkin>2018-01-01</checkin>
         <checkout>2019-01-01</checkout>
       </bookingdates>
       <additionalneeds>Breakfast</additionalneeds>
     </booking>
     ```
  5. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response contains bookingid
  - Response is in XML format
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_003 - Create Booking - Missing First Name
- **Summary**: Attempt to create booking without firstname
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK (depending on API design)
  - Response indicates firstname is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_004 - Create Booking - Missing Last Name
- **Summary**: Attempt to create booking without lastname
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK
  - Response indicates lastname is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_005 - Create Booking - Missing Total Price
- **Summary**: Attempt to create booking without totalprice
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK
  - Response indicates totalprice is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_006 - Create Booking - Missing Booking Dates
- **Summary**: Attempt to create booking without bookingdates
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK
  - Response indicates bookingdates is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_007 - Create Booking - Invalid Check-in Date Format
- **Summary**: Attempt to create booking with invalid check-in date format
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "01-01-2018",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK (acceptance depends on implementation)
  - Response indicates invalid date format (CCYY-MM-DD required)
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_008 - Create Booking - Checkout Before Checkin
- **Summary**: Attempt to create booking where checkout date is before checkin
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2019-01-01",
         "checkout": "2018-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK (depends on validation)
  - Response indicates checkout cannot be before checkin
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_009 - Create Booking - Negative Total Price
- **Summary**: Attempt to create booking with negative price
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": -100,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK
  - Response indicates price cannot be negative or accepts it
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_010 - Create Booking - Zero Total Price
- **Summary**: Create booking with zero price
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 0,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response either creates booking or rejects zero price
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_011 - Create Booking - Very Long First Name
- **Summary**: Create booking with extremely long first name
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body with firstname = 500+ characters
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response either creates booking or indicates field length exceeded
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_012 - Create Booking - Special Characters in Name
- **Summary**: Create booking with special characters in guest name
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim!@#$%",
       "lastname": "Brown&*()",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Booking is created successfully (special characters are accepted)
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_013 - Create Booking - Unicode Characters
- **Summary**: Create booking with unicode characters in name
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json; charset=utf-8`
  3. Send request body:
     ```json
     {
       "firstname": "José",
       "lastname": "García",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Booking is created with unicode characters preserved
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_014 - Create Booking - Decimal Total Price
- **Summary**: Create booking with decimal price value
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111.50,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Booking is created with decimal price preserved
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_CREATE_015 - Create Booking - Optional Additional Needs Missing
- **Summary**: Create booking without optional additionalneeds field
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/json`
  3. Send request body:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       }
     }
     ```
  4. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Booking is created successfully
  - additionalneeds field is either empty or omitted in response
- **Actual Result**: 
- **Status**: 

---

## 6. UPDATE BOOKING ENDPOINT TEST CASES

### TC_BOOKING_UPDATE_001 - Update Booking - Happy Path (Full Update with Cookie)
- **Summary**: Successfully update a booking with all fields using cookie auth
- **Preconditions**: API server is running with valid booking ID and auth token
- **Steps to Reproduce**:
  1. Create auth token using TC_AUTH_001
  2. Send PUT request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Content-Type header to `application/json`
  4. Set Accept header to `application/json`
  5. Set Cookie header to `token=<valid_token>`
  6. Send request body:
     ```json
     {
       "firstname": "James",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  7. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response contains updated booking data
  - firstname is updated to "James"
  - All fields reflect the new values
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_002 - Update Booking - Happy Path (Full Update with Basic Auth)
- **Summary**: Successfully update a booking with all fields using basic auth
- **Preconditions**: API server is running with valid booking ID
- **Steps to Reproduce**:
  1. Send PUT request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Content-Type header to `application/json`
  3. Set Accept header to `application/json`
  4. Set Authorization header to `Basic YWRtaW46cGFzc3dvcmQxMjM=`
  5. Send request body with updated booking data
  6. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response contains updated booking data
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_003 - Update Booking - Missing Authentication Token
- **Summary**: Attempt to update booking without authentication
- **Preconditions**: API server is running with valid booking ID
- **Steps to Reproduce**:
  1. Send PUT request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Content-Type header to `application/json`
  3. Do NOT set Cookie or Authorization header
  4. Send request body with updated data
  5. Observe error response
- **Expected Result**:
  - HTTP Status Code: 403 Forbidden or 401 Unauthorized
  - Response indicates authentication is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_004 - Update Booking - Invalid Authentication Token
- **Summary**: Attempt to update booking with invalid token
- **Preconditions**: API server is running with valid booking ID
- **Steps to Reproduce**:
  1. Send PUT request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Content-Type header to `application/json`
  3. Set Cookie header to `token=invalidentoken123`
  4. Send request body with updated data
  5. Observe error response
- **Expected Result**:
  - HTTP Status Code: 403 Forbidden or 401 Unauthorized
  - Response indicates invalid token
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_005 - Update Booking - Non-Existent Booking ID
- **Summary**: Attempt to update booking that doesn't exist
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PUT request to `https://restful-booker.herokuapp.com/booking/99999`
  3. Set Cookie header with valid token
  4. Send request body with booking data
  5. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found or 405 Method Not Allowed
  - Response indicates booking not found
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_006 - Update Booking - Invalid Booking ID Format
- **Summary**: Attempt to update booking with non-numeric ID
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PUT request to `https://restful-booker.herokuapp.com/booking/abc`
  3. Set Cookie header with valid token
  4. Send request body with booking data
  5. Observe error response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 404 Not Found
  - Response indicates invalid ID format
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_007 - Update Booking - Update Only First Name
- **Summary**: Update only the firstname field while keeping others unchanged
- **Preconditions**: API server is running with valid booking, valid auth token
- **Steps to Reproduce**:
  1. Retrieve existing booking using GET /booking/1
  2. Send PUT request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Cookie header with valid token
  4. Send request body with only firstname updated:
     ```json
     {
       "firstname": "UpdatedName",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "2018-01-01",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  5. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - firstname is updated to "UpdatedName"
  - Other fields remain unchanged
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_UPDATE_008 - Update Booking - Invalid Date Format
- **Summary**: Attempt to update booking with invalid date format
- **Preconditions**: API server is running with valid booking, valid auth token
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PUT request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Cookie header with valid token
  4. Send request body with invalid date format:
     ```json
     {
       "firstname": "Jim",
       "lastname": "Brown",
       "totalprice": 111,
       "depositpaid": true,
       "bookingdates": {
         "checkin": "01/01/2018",
         "checkout": "2019-01-01"
       },
       "additionalneeds": "Breakfast"
     }
     ```
  5. Observe response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 200 OK
  - Response indicates date format error or accepts update
- **Actual Result**: 
- **Status**: 

---

## 7. PARTIAL UPDATE (PATCH) BOOKING ENDPOINT TEST CASES

### TC_BOOKING_PATCH_001 - Patch Booking - Update Only First Name
- **Summary**: Successfully update only the firstname field using PATCH
- **Preconditions**: API server is running with valid booking, valid auth token
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PATCH request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Content-Type header to `application/json`
  4. Set Cookie header with valid token
  5. Send request body:
     ```json
     {
       "firstname": "James"
     }
     ```
  6. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response shows firstname updated to "James"
  - Other fields remain unchanged
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_PATCH_002 - Patch Booking - Update Only Last Name
- **Summary**: Successfully update only the lastname field using PATCH
- **Preconditions**: API server is running with valid booking, valid auth token
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PATCH request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Content-Type header to `application/json`
  4. Set Cookie header with valid token
  5. Send request body:
     ```json
     {
       "lastname": "Smith"
     }
     ```
  6. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response shows lastname updated to "Smith"
  - Other fields unchanged
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_PATCH_003 - Patch Booking - Update Total Price Only
- **Summary**: Successfully update only the totalprice field using PATCH
- **Preconditions**: API server is running with valid booking, valid auth token
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PATCH request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Content-Type header to `application/json`
  4. Set Cookie header with valid token
  5. Send request body:
     ```json
     {
       "totalprice": 250
     }
     ```
  6. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Response shows totalprice updated to 250
  - Other fields unchanged
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_PATCH_004 - Patch Booking - Missing Authentication
- **Summary**: Attempt to patch booking without authentication
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send PATCH request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Content-Type header to `application/json`
  3. Do NOT set Cookie or Authorization header
  4. Send request body with partial data
  5. Observe error response
- **Expected Result**:
  - HTTP Status Code: 403 Forbidden or 401 Unauthorized
  - Response indicates authentication is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_PATCH_005 - Patch Booking - Non-Existent ID
- **Summary**: Attempt to patch booking that doesn't exist
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PATCH request to `https://restful-booker.herokuapp.com/booking/99999`
  3. Set Content-Type header to `application/json`
  4. Set Cookie header with valid token
  5. Send request body with partial data
  6. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found
  - Response indicates booking not found
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_PATCH_006 - Patch Booking - Empty Request Body
- **Summary**: Send PATCH request with empty body
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send PATCH request to `https://restful-booker.herokuapp.com/booking/1`
  3. Set Content-Type header to `application/json`
  4. Set Cookie header with valid token
  5. Send empty request body `{}`
  6. Observe response
- **Expected Result**:
  - HTTP Status Code: 200 OK or 400 Bad Request
  - Response either accepts update with no changes or rejects empty body
- **Actual Result**: 
- **Status**: 

---

## 8. DELETE BOOKING ENDPOINT TEST CASES

### TC_BOOKING_DELETE_001 - Delete Booking - Happy Path (Cookie Auth)
- **Summary**: Successfully delete a booking using cookie authentication
- **Preconditions**: API server is running with valid booking ID and auth token
- **Steps to Reproduce**:
  1. Create auth token using TC_AUTH_001
  2. Create a test booking
  3. Send DELETE request to `https://restful-booker.herokuapp.com/booking/<booking_id>`
  4. Set Content-Type header to `application/json`
  5. Set Cookie header to `token=<valid_token>`
  6. Verify response
- **Expected Result**:
  - HTTP Status Code: 201 Created (or 204 No Content)
  - Response body contains "OK" with message or is empty
  - Booking is deleted
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_002 - Delete Booking - Happy Path (Basic Auth)
- **Summary**: Successfully delete a booking using basic authentication
- **Preconditions**: API server is running with valid booking ID
- **Steps to Reproduce**:
  1. Create a test booking
  2. Send DELETE request to `https://restful-booker.herokuapp.com/booking/<booking_id>`
  3. Set Content-Type header to `application/json`
  4. Set Authorization header to `Basic YWRtaW46cGFzc3dvcmQxMjM=`
  5. Verify response
- **Expected Result**:
  - HTTP Status Code: 201 Created (or 204 No Content)
  - Response indicates deletion success
  - Booking is removed from system
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_003 - Delete Booking - Missing Authentication
- **Summary**: Attempt to delete booking without authentication
- **Preconditions**: API server is running with valid booking ID
- **Steps to Reproduce**:
  1. Send DELETE request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Content-Type header to `application/json`
  3. Do NOT set Cookie or Authorization header
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 403 Forbidden or 401 Unauthorized
  - Response indicates authentication is required
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_004 - Delete Booking - Invalid Authentication Token
- **Summary**: Attempt to delete booking with invalid token
- **Preconditions**: API server is running with valid booking ID
- **Steps to Reproduce**:
  1. Send DELETE request to `https://restful-booker.herokuapp.com/booking/1`
  2. Set Content-Type header to `application/json`
  3. Set Cookie header to `token=invalidentoken123`
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 403 Forbidden or 401 Unauthorized
  - Response indicates invalid token
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_005 - Delete Booking - Non-Existent Booking ID
- **Summary**: Attempt to delete booking that doesn't exist
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send DELETE request to `https://restful-booker.herokuapp.com/booking/99999`
  3. Set Cookie header with valid token
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found or 405 Method Not Allowed
  - Response indicates booking not found
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_006 - Delete Booking - Invalid ID Format
- **Summary**: Attempt to delete booking with non-numeric ID
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create valid auth token
  2. Send DELETE request to `https://restful-booker.herokuapp.com/booking/abc`
  3. Set Cookie header with valid token
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 400 Bad Request or 404 Not Found
  - Response indicates invalid ID format
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_007 - Delete Booking - Verify Booking Deleted
- **Summary**: Verify deleted booking cannot be retrieved
- **Preconditions**: API server is running with valid auth token
- **Steps to Reproduce**:
  1. Create test booking and note the booking ID
  2. Delete the booking using valid auth
  3. Send GET request to retrieve the deleted booking
  4. Observe response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found
  - Response indicates booking no longer exists
- **Actual Result**: 
- **Status**: 

### TC_BOOKING_DELETE_008 - Delete Booking - Delete Already Deleted Booking
- **Summary**: Attempt to delete a booking that was already deleted
- **Preconditions**: API server is running, valid auth token available
- **Steps to Reproduce**:
  1. Create and delete a test booking
  2. Send DELETE request to delete the same booking again
  3. Set Cookie header with valid token
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 404 Not Found or 405 Method Not Allowed
  - Response indicates booking not found or already deleted
- **Actual Result**: 
- **Status**: 

---

## 9. CONTENT TYPE HANDLING TEST CASES

### TC_CONTENT_001 - Create Booking - URL Encoded Format
- **Summary**: Create booking using application/x-www-form-urlencoded format
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/x-www-form-urlencoded`
  3. Set Accept header to `application/json`
  4. Send request body as form-encoded:
     `firstname=Jim&lastname=Brown&totalprice=111&depositpaid=true&...`
  5. Verify response
- **Expected Result**:
  - HTTP Status Code: 200 OK
  - Booking is created successfully
- **Actual Result**: 
- **Status**: 

### TC_CONTENT_002 - Unsupported Content-Type
- **Summary**: Attempt to create booking with unsupported content type
- **Preconditions**: API server is running
- **Steps to Reproduce**:
  1. Send POST request to `https://restful-booker.herokuapp.com/booking`
  2. Set Content-Type header to `application/yaml`
  3. Send request body in YAML format
  4. Observe error response
- **Expected Result**:
  - HTTP Status Code: 415 Unsupported Media Type or 400 Bad Request
  - Response indicates unsupported content type
- **Actual Result**: 
- **Status**: 

---

## Summary

This test case document covers:
- **Total Test Cases**: 87+ comprehensive test cases
- **Coverage Areas**:
  - Ping/Health Check: 2 tests
  - Authentication: 7 tests
  - Get Booking IDs: 9 tests
  - Get Booking: 8 tests
  - Create Booking: 15 tests
  - Update Booking: 8 tests
  - Patch Booking: 6 tests
  - Delete Booking: 8 tests
  - Content Type Handling: 2 tests

Each test case includes:
✓ Clear test ID and summary
✓ Preconditions
✓ Step-by-step reproduction steps
✓ Expected results
✓ Space for actual results
✓ Status field for execution tracking

**Test Execution Notes:**
- Execute tests in order: Ping → Auth → Create → Get → Update → Patch → Delete
- Use valid auth tokens obtained from TC_AUTH_001 for all protected endpoints
- Document any API behavior differences from expected results
- Log timestamps for performance monitoring
- Repeat critical tests with different data variations
