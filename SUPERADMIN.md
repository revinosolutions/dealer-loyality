# Permanent SuperAdmin Account

This document describes the permanent superadmin account configuration and how to ensure it's always available for system access.

## Credentials

The permanent superadmin account has the following credentials:

- **Email**: `superadmin@revino.com`
- **Password**: `password123`

These credentials are hardcoded and protected throughout the system to ensure this account always exists and can always be used to log in.

## Protection Mechanisms

The permanent superadmin account is protected in several ways:

1. **Mongoose Schema Protection**: The User model has been modified to prevent deletion or modification of the permanent superadmin account through Mongoose operations.
   
2. **Authentication Protection**: The login route has special handling for the permanent superadmin account, ensuring it can always log in with the correct credentials.

3. **Password Recovery**: If the password gets changed, the system allows login using the hardcoded password `password123`, which will reset the account's password.

## Setup

To ensure the permanent superadmin exists in your database and all protections are in place, run:

```bash
npm run admin:set-permanent
```

This script:
- Creates the permanent superadmin if it doesn't exist
- Updates an existing superadmin account if needed
- Adds protective hooks to prevent deletion or modification
- Ensures the account is marked as a permanent superadmin

## Implementation Details

### Data Model

The User model has a new field:

```javascript
isPermanentSuperadmin: {
  type: Boolean,
  default: false
}
```

This field marks the account as protected. The permanent superadmin will always have this field set to `true`.

### Authentication Changes

The authentication system has been modified to:

1. Detect login attempts for the permanent superadmin account
2. Always accept the hardcoded password `password123` for this account
3. Auto-correct the account status and role if needed

### Protective Measures

The following protective measures are in place:

- Middleware to prevent deletion of the permanent superadmin account
- Middleware to prevent modifying critical fields of the permanent superadmin
- Automatic restoration of the permanent superadmin account on login

## Troubleshooting

If you cannot log in with the superadmin account, run the setup script:

```bash
npm run admin:set-permanent
```

This will restore the permanent superadmin account with the correct credentials. 