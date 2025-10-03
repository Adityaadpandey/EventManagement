# DDoS Protection Flow Diagram

## Request Flow Through Protection Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         INCOMING REQUEST                         │
│                    (from Internet/Client)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 1: NGINX EDGE                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. User Agent Check                                       │  │
│  │    ├─ Empty? → 403 BLOCKED                              │  │
│  │    └─ Bot/Scraper? → 403 BLOCKED                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Attack Pattern Check                                   │  │
│  │    ├─ SQL Injection? → 403 BLOCKED                       │  │
│  │    ├─ XSS Attempt? → 403 BLOCKED                         │  │
│  │    └─ Suspicious Referer? → 403 BLOCKED                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Connection Limit Check                                 │  │
│  │    ├─ Per IP: > 20? → 429 RATE LIMITED                   │  │
│  │    └─ Global: > 5000? → 503 SERVICE UNAVAILABLE          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. Rate Limit Check (Zone-based)                          │  │
│  │    ├─ General: > 500/min? → 429 RATE LIMITED             │  │
│  │    ├─ API: > 200/min? → 429 RATE LIMITED                 │  │
│  │    ├─ Auth: > 10/min? → 429 RATE LIMITED                 │  │
│  │    ├─ Heavy: > 30/min? → 429 RATE LIMITED                │  │
│  │    └─ Burst: > 30/sec? → 429 RATE LIMITED                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Cache Check (GET requests only)                        │  │
│  │    ├─ Cache HIT? → Return cached response (FAST!)        │  │
│  │    └─ Cache MISS? → Continue to backend                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Timeout Protection                                      │  │
│  │    ├─ Header timeout: > 10s? → 408 TIMEOUT               │  │
│  │    └─ Body timeout: > 10s? → 408 TIMEOUT                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 LAYER 2: SECURITY MIDDLEWARE                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Suspicious IP Check                                    │  │
│  │    └─ IP in blocklist? → 403 BLOCKED                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Request Size Validation                                │  │
│  │    └─ > 5MB? → 413 PAYLOAD TOO LARGE                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 3. Attack Pattern Detection                               │  │
│  │    ├─ SQL Injection in body? → 403 BLOCKED               │  │
│  │    ├─ XSS in body? → 403 BLOCKED                         │  │
│  │    └─ Suspicious patterns? → 403 BLOCKED                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 4. JSON Validation (POST/PUT/PATCH)                       │  │
│  │    └─ Invalid JSON? → 400 BAD REQUEST                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 5. Slowloris Detection                                     │  │
│  │    └─ > 50 requests in 10s? → 429 TOO MANY REQUESTS      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 6. Rapid-Fire Detection                                    │  │
│  │    └─ > 20 requests/sec? → 429 TOO MANY REQUESTS         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 3: APPLICATION RATE LIMITING                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Redis Rate Limit Check                                 │  │
│  │    ├─ General: > 250/15min? → 429 + Track IP             │  │
│  │    ├─ Auth: > 8/15min? → 429 + Track IP                  │  │
│  │    ├─ Heavy: > 15/5min? → 429 + Track IP                 │  │
│  │    ├─ Burst: > 60/min? → 429 + Track IP                  │  │
│  │    └─ Admin: > 40/15min? → 429 + Track IP                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Violation Tracking                                      │  │
│  │    ├─ 5+ violations? → Add to blocklist (1 hour)         │  │
│  │    └─ Log security alert                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 4: DOCKER SECURITY                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Resource Limits                                         │  │
│  │    ├─ CPU: Max 2.5 cores                                  │  │
│  │    └─ Memory: Max 3GB                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Security Hardening                                      │  │
│  │    ├─ No new privileges                                   │  │
│  │    ├─ Dropped capabilities                                │  │
│  │    └─ Network optimization                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND APPLICATION                         │
│                    (Process Request)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RESPONSE                                 │
│                    (Back to Client)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Attack Scenarios

### Scenario 1: DDoS Attack (Volume)
```
Attacker sends 10,000 requests/second
                │
                ▼
Layer 1: Nginx blocks 99% (rate limits)
                │
                ▼
Layer 2: Security middleware blocks remaining
                │
                ▼
Layer 3: Application rate limiting catches stragglers
                │
                ▼
Result: < 1% reaches backend, system stable
```

### Scenario 2: SQL Injection Attempt
```
Attacker sends: /api/event?id=1' UNION SELECT
                │
                ▼
Layer 1: Nginx detects pattern → 403 BLOCKED
                │
                ▼
Result: Attack blocked immediately, logged
```

### Scenario 3: Bot Scraping
```
Bot sends requests with User-Agent: "python-requests"
                │
                ▼
Layer 1: Nginx detects bot → 403 BLOCKED
                │
                ▼
Result: Bot blocked, no backend load
```

### Scenario 4: Brute Force Login
```
Attacker tries 100 login attempts
                │
                ▼
Layer 1: Nginx rate limit (10/min) → 429 after 10
                │
                ▼
Layer 3: Application tracks violations
                │
                ▼
After 5 violations: IP auto-blocked for 1 hour
                │
                ▼
Result: Account protected, attacker blocked
```

### Scenario 5: Slowloris Attack
```
Attacker opens 100 slow connections
                │
                ▼
Layer 1: Nginx timeout protection (10s)
                │
                ▼
Layer 2: Slowloris detection (50 req/10s)
                │
                ▼
Result: Connections closed, IP blocked
```

## Legitimate User Flow

### Scenario: Normal User Browsing
```
User visits website
                │
                ▼
Layer 1: Nginx checks (all pass)
                │
                ▼
Layer 1: Cache HIT → Return cached response (50ms)
                │
                ▼
Result: Fast response, no backend load
```

### Scenario: User Makes Purchase
```
User submits payment
                │
                ▼
Layer 1: Nginx checks (all pass)
                │
                ▼
Layer 2: Security checks (all pass)
                │
                ▼
Layer 3: Rate limit check (within limits)
                │
                ▼
Backend: Process payment
                │
                ▼
Result: Successful transaction (200ms)
```

## Cache Flow

```
GET Request
    │
    ▼
┌─────────────────┐
│  Cache Check    │
└────┬────────┬───┘
     │        │
     │        └─ MISS ──┐
     │                  │
     └─ HIT             ▼
        │         ┌──────────────┐
        │         │   Backend    │
        │         └──────┬───────┘
        │                │
        │                ▼
        │         ┌──────────────┐
        │         │ Store in     │
        │         │ Cache (5min) │
        │         └──────┬───────┘
        │                │
        └────────────────┘
                 │
                 ▼
          Return Response
```

## Monitoring Flow

```
┌─────────────────────────────────────────┐
│         Monitoring Script               │
│      (./scripts/monitor-ddos.sh)        │
└────────────┬────────────────────────────┘
             │
             ├─► Check Nginx connections
             │
             ├─► Check rate limit violations
             │
             ├─► Check blocked IPs
             │
             ├─► Check attack detections
             │
             ├─► Check cache performance
             │
             ├─► Check resource usage
             │
             ├─► Check security alerts
             │
             └─► Generate report
                      │
                      ▼
              ┌───────────────┐
              │  Alert if:    │
              │  - High load  │
              │  - Many blocks│
              │  - Attacks    │
              └───────────────┘
```

## Decision Tree

```
                    Request Arrives
                          │
                          ▼
                   Valid User Agent?
                    /           \
                  NO             YES
                  │               │
                  ▼               ▼
              403 BLOCK    Attack Pattern?
                            /           \
                          YES            NO
                          │               │
                          ▼               ▼
                      403 BLOCK    Within Rate Limit?
                                    /           \
                                  NO             YES
                                  │               │
                                  ▼               ▼
                              429 LIMIT      In Cache?
                                              /       \
                                            YES        NO
                                            │           │
                                            ▼           ▼
                                    Return Cache   Process Request
                                                          │
                                                          ▼
                                                   Return Response
```

## Summary

- **4 Layers** of protection
- **Multiple checks** at each layer
- **Automatic blocking** of attacks
- **Caching** for performance
- **Monitoring** for visibility
- **Graceful degradation** under load

**Protection Level**: 🛡️🛡️🛡️🛡️🛡️ (5/5)
