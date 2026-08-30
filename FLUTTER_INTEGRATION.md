# ProfileX — Flutter Frontend Integration Guide

This guide provides everything needed to connect your **ProfileX Flutter application** to the **ProfileX Node.js + Express Backend API** (backed by hosted Aiven MySQL).

---

## 1. Architecture Overview

```text
Flutter App (ProfileX)
        ↓
    Dio Client (HTTP/HTTPS)
        ↓
Node.js + Express Backend (/api/v1)
        ↓  (mysql2 over TLS/SSL)
Aiven Hosted MySQL
```

> **Security Rule**: The Flutter mobile app **never** connects directly to MySQL and never receives database credentials. All requests go through the HTTPS REST API endpoints.

---

## 2. API Base URLs for Flutter

When testing locally from a mobile device or emulator, select the appropriate host:

| Environment | Base URL |
| :--- | :--- |
| **Android Emulator** | `http://10.0.2.2:5000/api/v1` |
| **iOS Simulator** | `http://localhost:5000/api/v1` |
| **Physical Phone (LAN / Wi-Fi)** | `http://<YOUR_COMPUTER_LOCAL_IP>:5000/api/v1` *(e.g. `http://192.168.1.15:5000/api/v1`)* |
| **Production Server** | `https://api.yourdomain.com/api/v1` |

---

## 3. Recommended Flutter Dependencies

Add these to your Flutter app's `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  dio: ^5.7.0                     # HTTP client with interceptors
  flutter_secure_storage: ^9.2.2  # Secure storage for JWT token (Keychain / Keystore)
```

---

## 4. Standard Response Format

All backend endpoints return a uniform JSON format:

### Success Response
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is already registered"
    }
  ]
}
```

### Login Account Lockout Policy (`POST /api/v1/auth/login`)

The backend tracks failed password attempts per account and enforces the following exact responses:

| Situation | Response Message (`message`) | HTTP Status | Action Taken |
| :--- | :--- | :--- | :--- |
| Wrong username / identifier | **`Username incorrect`** | `401` | No attempt count changed |
| Correct username + wrong password (1st time) | **`Password incorrect. 2 attempts left`** | `401` | Attempts set to 1 |
| Correct username + wrong password (2nd time) | **`Password incorrect. 1 attempt left`** | `401` | Attempts set to 2 |
| Correct username + wrong password (3rd time) | **`Account locked. Contact admin`** | `401` | Account locked (`is_locked = 1`) |
| Account already locked | **`Account locked. Contact admin`** | `401` | Login blocked |
| Correct password after failed attempts | **`Login successful`** | `200` | Attempts reset to 0 (3 available again) |

---

## 5. Dart Data Models

### `user_model.dart`
```dart
class UserModel {
  final String id;
  final String name;
  final String email;
  final String mobile;
  final String dob; // Format: YYYY-MM-DD
  final String username;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.mobile,
    required this.dob,
    required this.username,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      mobile: json['mobile'] as String,
      dob: (json['dob'] as String).split('T')[0],
      username: json['username'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'mobile': mobile,
      'dob': dob,
      'username': username,
    };
  }
}
```

### `auth_response_model.dart`
```dart
import 'user_model.dart';

class AuthResponseModel {
  final String token;
  final UserModel user;

  AuthResponseModel({
    required this.token,
    required this.user,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      token: json['token'] as String,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
```

---

## 6. Dio Client Setup & Token Interceptor

Create `api_client.dart` to handle authentication headers and errors automatically:

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String _baseUrl = 'http://10.0.2.2:5000/api/v1'; // Update for your device
  static const String _tokenKey = 'jwt_token';

  late final Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiClient() {
    dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Attach Interceptor for Bearer Token
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            // Token expired or invalid — clear token & redirect to login screen
            await _storage.delete(key: _tokenKey);
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }
}
```

---

## 7. Complete API Service Methods

Create `api_service.dart`:

```dart
import 'package:dio/dio.dart';
import 'api_client.dart';
import 'auth_response_model.dart';
import 'user_model.dart';

class ApiService {
  final ApiClient _client;

  ApiService(this._client);

  /// 1. Health Check
  Future<bool> checkHealth() async {
    try {
      final response = await _client.dio.get('/health');
      return response.statusCode == 200 && response.data['success'] == true;
    } catch (_) {
      return false;
    }
  }

  /// 2. User Registration
  Future<UserModel> register({
    required String name,
    required String email,
    required String mobile,
    required String dob, // 'YYYY-MM-DD'
    required String username,
    required String password,
  }) async {
    try {
      final response = await _client.dio.post(
        '/auth/register',
        data: {
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'mobile': mobile.trim(),
          'dob': dob.trim(),
          'username': username.trim().toLowerCase(),
          'password': password,
        },
      );

      final data = response.data['data'] as Map<String, dynamic>;
      return UserModel.fromJson(data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// 3. User Login
  Future<AuthResponseModel> login({
    required String identifier, // Email or Username
    required String password,
  }) async {
    try {
      final response = await _client.dio.post(
        '/auth/login',
        data: {
          'identifier': identifier.trim(),
          'password': password,
        },
      );

      final authData = AuthResponseModel.fromJson(response.data['data']);
      // Store JWT token securely in device Keychain / Keystore
      await _client.saveToken(authData.token);
      return authData;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// 4. User Logout
  Future<void> logout() async {
    try {
      await _client.dio.post('/auth/logout');
    } catch (_) {
      // Proceed with clearing local token even if network fails
    } finally {
      await _client.clearToken();
    }
  }

  /// 5. Get User Profile
  Future<UserModel> getProfile() async {
    try {
      final response = await _client.dio.get('/profile');
      final data = response.data['data'] as Map<String, dynamic>;
      return UserModel.fromJson(data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  /// 6. Update User Profile
  /// Note: email cannot be changed. Client must not send email or userId.
  Future<UserModel> updateProfile({
    required String name,
    required String mobile,
    required String dob, // 'YYYY-MM-DD'
    required String username,
  }) async {
    try {
      final response = await _client.dio.put(
        '/profile',
        data: {
          'name': name.trim(),
          'mobile': mobile.trim(),
          'dob': dob.trim(),
          'username': username.trim().toLowerCase(),
        },
      );

      final data = response.data['data'] as Map<String, dynamic>;
      return UserModel.fromJson(data);
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }

  String _handleDioError(DioException e) {
    if (e.response != null && e.response?.data != null) {
      final body = e.response?.data;
      if (body is Map<String, dynamic>) {
        if (body['errors'] is List && (body['errors'] as List).isNotEmpty) {
          final firstError = body['errors'][0];
          return firstError['message'] ?? body['message'] ?? 'Validation error';
        }
        return body['message'] ?? 'An unexpected error occurred';
      }
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Connection timed out. Please check your internet connection.';
    }
    return 'Failed to connect to server. Please try again.';
  }
}
```

---

## 8. Frontend Form Validation Rules

Ensure your Flutter UI forms enforce the same rules as the backend:

| Field | Validation Rule | Error Message |
| :--- | :--- | :--- |
| **Name** | Required, max 100 characters | `"Please enter your name (max 100 characters)"` |
| **Email** | Required, valid email regex (`^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$`) | `"Please enter a valid email address"` |
| **Mobile** | Required, 7–20 digits (`^[0-9+]{7,20}$`) | `"Enter a valid mobile number (7–20 digits)"` |
| **DOB** | Required, format `YYYY-MM-DD`, cannot be in the future | `"Please select a valid date of birth"` |
| **Username** | Required, 3–50 chars, alphanumeric & underscore only (`^[a-zA-Z0-9_]{3,50}$`) | `"Username must be 3-50 chars, letters/numbers/underscore only"` |
| **Password** | Required, min 8 chars, at least 1 letter and 1 number | `"Password must be at least 8 chars with 1 letter & 1 number"` |

> [!WARNING]
> **Email is Read-Only**: Do not provide an editable email field in the Profile Edit screen. Attempting to send `email` in `PUT /api/v1/profile` will return a `400 Bad Request`.

---

## 9. Error Status Codes Reference

| HTTP Status | Meaning | What Flutter Should Do |
| :---: | :--- | :--- |
| **200** | OK | Success (Display updated data) |
| **201** | Created | Registration succeeded (Navigate to Login or Home) |
| **400** | Bad Request | Display validation message to the user |
| **401** | Unauthorized | Token expired or invalid credentials; redirect to Login |
| **404** | Not Found | User record does not exist |
| **409** | Conflict | Duplicate `email`, `username`, or `mobile` (Prompt user to change field) |
| **429** | Too Many Requests | Rate limit hit (10 attempts / 15 mins); show cooldown alert |
| **500** | Server Error | Show generic `"Something went wrong, please try later"` |
| **503** | Service Unavailable | Database temporarily unreachable; offer retry button |
