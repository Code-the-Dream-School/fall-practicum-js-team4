# Frontend E2E Smoke Test Checklist

Reusable manual testing checklist for the Lost & Found Pet Reports application.

The purpose is to verify that the main user workflows function correctly from
the frontend, including authentication, browsing reports, creating reports,
and checking that submitted data is consistent across pages.

## Test Information

| Field | Value |
|---|---|
| Tester | |
| Test date | |
| Environment / URL | |
| Browser | |
| Branch / commit | |
| Overall result | Not started |

## How to Use This Checklist

Mark each test as one of the following:

- **PASS** — The actual result matches the expected result.
- **FAIL** — The actual result does not match the expected result.
- **BLOCKED** — The test cannot be completed because a feature is missing or unavailable.
- **N/A** — The test does not apply to the current environment.

Record failures with the steps to reproduce, expected result, actual result,
and screenshots when available.

## 1. User Lifecycle — Registration, Login, and Logout

### 1.1 Register a new account

**Precondition:** The user is signed out and has an email address not already registered.

1. Open the application.
2. Navigate to Register.
3. Enter a valid name.
4. Enter a valid, unused email address.
5. Enter a password that meets the requirements.
6. Confirm the password.
7. Submit the registration form.

**Expected results:**
- The account is created successfully.
- A success message is displayed.
- The user is signed in.
- The user is redirected to the dashboard.

Result: ______

### 1.2 Registration validation

1. Open the registration form.
2. Submit without entering required fields.
3. Try an invalid email address.
4. Try a password shorter than the minimum length.
5. Enter different values in Password and Confirm Password.
6. Try registering with an email address that already exists.

**Expected results:**
- Required fields are validated.
- Invalid email and password values are rejected.
- Password mismatch is reported.
- Duplicate email registration is rejected with a useful message.
- Invalid submissions do not create an account.

Result: ______

### 1.3 Log in with valid credentials

1. Sign out if currently signed in.
2. Navigate to Login.
3. Enter a registered email address.
4. Enter the correct password.
5. Submit the form.

**Expected results:**
- Login succeeds.
- A welcome message is displayed.
- The user is redirected to the dashboard or previously requested protected page.
- Authenticated navigation is displayed.

Result: ______

### 1.4 Log in with invalid credentials

1. Sign out.
2. Navigate to Login.
3. Enter an incorrect password or unregistered email.
4. Submit the form.

**Expected results:**
- Login is rejected.
- A useful error message is displayed.
- The user remains signed out.

Result: ______

### 1.5 Log out

1. Sign in.
2. Use the Logout control in the navigation.
3. Wait for the logout operation to finish.

**Expected results:**
- Logout succeeds.
- The user is redirected to Login.
- Signed-out navigation is displayed.
- Visiting a protected page redirects to Login.

Result: ______

## 2. Non-Logged-In User Journey

**Precondition:** The visitor is signed out.

1. Open the Home page.
2. Navigate to Lost Pets.
3. Navigate to Found Pets.
4. Navigate to Analytics.
5. Try to access the Report Lost action.
6. Try to access the Report Found action.
7. Try to access the protected Profile or Dashboard page.

**Expected results:**
- Public pages are accessible without signing in.
- Public report directories load without requiring authentication.
- Report creation requires authentication.
- Protected pages redirect the visitor to Login.
- Sign In and Register options are available in the navigation.

Result: ______

**Note:** The Pet Details route currently displays placeholder content.
Do not treat it as a fully working report-details page until that feature is implemented.

## 3. Lost Report Workflow

**Precondition:** A registered user is signed in.

### 3.1 Create a lost pet report

1. Select Report Lost.
2. Confirm the form is for a lost pet.
3. Enter the required pet information.
4. Enter the event date.
5. Enter contact information.
6. Enter location information.
7. Optionally upload photos.
8. Submit the form.

**Expected results:**
- The report is submitted successfully.
- A success message is displayed.
- The report has type LOST.
- The report appears in the Lost Pets directory.
- The report appears in the signed-in user's My Reports list.

Result: ______

### 3.2 Validate lost report fields

1. Open the Report Lost form.
2. Submit with required fields missing.
3. Try an invalid ZIP code.
4. Try a future event date.
5. Try entering a city without a state, or a state without a city.

**Expected results:**
- Required fields are validated.
- ZIP code must contain five digits when location is provided.
- Future event dates are rejected.
- Incomplete location information is rejected.
- Invalid reports are not created.

Result: ______

### 3.3 Read a lost report

1. Open Lost Pets.
2. Locate the report created in section 3.1.
3. Compare the displayed information with the submitted form.
4. Open My Reports.
5. Locate the same report.

**Expected results:**
- The report appears in the Lost Pets directory.
- The report appears in My Reports for its owner.
- Displayed pet information matches the submitted values.

Result: ______

## 4. Found Report Workflow

**Precondition:** A registered user is signed in.

### 4.1 Create a found pet report

1. Select Report Found.
2. Confirm the form is for a found pet.
3. Enter the required pet information.
4. Enter the event date.
5. Enter contact information.
6. Enter location information.
7. Optionally upload photos.
8. Submit the form.

**Expected results:**
- The report is submitted successfully.
- A success message is displayed.
- The report has type FOUND.
- The report appears in the Found Pets directory.
- The report appears in the signed-in user's My Reports list.

Result: ______

### 4.2 Validate found report fields

1. Open the Report Found form.
2. Submit with required fields missing.
3. Try an invalid ZIP code.
4. Try a future event date.
5. Try incomplete location information.

**Expected results:**
- Required fields are validated.
- Invalid ZIP codes are rejected.
- Future event dates are rejected.
- Incomplete location information is rejected.
- Invalid reports are not created.

Result: ______

### 4.3 Read a found report

1. Open Found Pets.
2. Locate the report created in section 4.1.
3. Compare the displayed information with the submitted form.
4. Open My Reports.
5. Locate the same report.

**Expected results:**
- The report appears in the Found Pets directory.
- The report appears in My Reports for its owner.
- Displayed pet information matches the submitted values.

Result: ______

## 5. Report Updates and Consistency Checks

### 5.1 Mark a lost report as reunited

**Precondition:** The signed-in user owns a LOST report with ACTIVE status.

1. Open My Reports.
2. Locate an active lost report.
3. Select the Mark Reunited action.
4. Confirm the action.

**Expected results:**
- The report status changes from ACTIVE to REUNITED.
- A success notification is displayed.
- The updated status is reflected in My Reports.
- The active report listings are refreshed as appropriate.
- The report is no longer treated as an active lost-pet report.

Result: ______

### 5.2 Edit report information

**Current status: BLOCKED**

The backend supports partial report updates through PATCH, but the
frontend currently does not provide a general report-edit form or edit action.

Once the frontend edit feature is implemented, test the following:

1. Open My Reports.
2. Select Edit on a report.
3. Change the pet name.
4. Change another field, such as color or breed.
5. Submit the update.
6. Reopen the report in My Reports.
7. Refresh the page and check the report again.
8. Check the appropriate public directory.

**Expected results after implementation:**
- The update succeeds.
- Changed fields show the new values.
- Unchanged fields retain their original values.
- Updated values remain correct after refreshing.
- The report remains associated with the correct owner and report type.

Result: BLOCKED — frontend edit workflow not implemented.

### 5.3 Delete a report

**Current status: BLOCKED**

The backend currently has no report deletion endpoint, and the frontend
does not provide a report deletion action.

Once deletion is implemented, test the following:

1. Open My Reports.
2. Select Delete on a report.
3. Confirm the deletion if prompted.
4. Refresh My Reports.
5. Check the appropriate public directory.

**Expected results after implementation:**
- The report is deleted successfully.
- The report no longer appears in My Reports.
- The report no longer appears in public listings.
- Other users cannot access the deleted report.

Result: BLOCKED — delete workflow not implemented.

## 6. Photo Upload Checks

1. Open either report form.
2. Select one valid image.
3. Confirm the image preview appears.
4. Remove the selected image, if desired.
5. Select multiple valid images.
6. Submit the report with photos.

**Expected results:**
- Valid images can be selected.
- Image previews display correctly.
- Selected images can be removed before submission.
- Uploaded report photos display with the report.
- Invalid files and upload errors are handled appropriately.

Result: ______

## 7. Cross-Page Data Consistency

After creating or updating a report, compare the information across pages.

| Field | Submitted value | Lost / Found directory | My Reports |
|---|---|---|---|
| Pet name | | | |
| Report type | | | |
| Pet type | | | |
| Breed | | | |
| Color | | | |
| Size | | | |
| Gender | | | |
| Event date | | | |
| City | | | |
| State | | | |
| Status | | | |

**Expected results:**
- The correct report type appears in the correct directory.
- Pet information matches the submitted values.
- My Reports only displays reports belonging to the signed-in user.
- Changes remain consistent after refreshing the page.
- Private information, such as contact details, is not exposed in public listings.

Result: ______

## 8. Issues Found

| Test section | Issue / steps to reproduce | Expected result | Actual result | Status |
|---|---|---|---|---|
| | | | | |

## 9. Final Test Summary

| Result | Count |
|---|---|
| PASS | |
| FAIL | |
| BLOCKED | |
| N/A | |
| Not tested | |

**Overall assessment:**

- [ ] Ready for broader manual testing
- [ ] Ready after fixing reported issues
- [ ] Blocked by missing functionality
