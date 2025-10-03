# DDoS Protection - Quick Reference Guide

## 🚨 Emergency Response

### If Under Attack

```bash
# 1. Check current status
./scripts/monitor-ddos.sh

# 2. View real-time logs
docker logs -f nginx_proxy | grep "limiting\|403"

# 3. Identify attacking IPs
docker logs nginx_proxy --since 5m | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# 4. Manually block an IP (if needed)
# Add to nginx.conf under server block:
# deny 1.2.3.4;
# Then: docker-compose restart nginx

# 5. Increase protection temporarily
# Edit nginx.conf rate limits (reduce max values)
# Edit rate-limit.middleware.ts (reduce max values)
# Rebuild and restart
```

## 📊 Rate Limits Summary

| Endpoint | Nginx Limit | App Limit | Burst |
|----------|-------------|-----------|-------|
| General | 500/min | 250/15min | 100 |
| API | 200/min | - | 30 |
| Auth | 10/min | 8/15min | 3 |
| Heavy Ops | 30/min | 15/5min | 5 |
| Admin | - | 40/15min | 2 |
| Burst | 30/sec | 60/min | 50 |

## 🔧 Quick Fixes

### Legitimate User Blocked

```bash
# 1. Find their IP in logs
docker logs backend-service | grep "blocked" | grep <IP>

# 2. Check Redis for their rate limit
docker exec -it <redis-container> redis-cli
> KEYS rl:*<IP>*
> DEL rl:general:<IP>  # Clear their rate limit

# 3. Restart backend to clear in-memory blocks
docker-compose restart backend-service
```

### High CPU Usage

```bash
# 1. Check which container
docker stats

# 2. Scale up workers
docker-compose up -d --scale worker=5

# 3. Increase cache times in nginx.conf
# proxy_cache_valid 200 10m;  # Increase from 5m
```

### Memory Issues

```bash
# 1. Check memory usage
docker stats

# 2. Clear nginx cache
docker exec nginx_proxy rm -rf /var/cache/nginx/*

# 3. Restart services
docker-compose restart
```

## 🛡️ Protection Layers

```
┌─────────────────────────────────────┐
│  Layer 1: Nginx Edge Protection     │
│  - Rate limiting                    │
│  - Connection limits                │
│  - Attack pattern blocking          │
│  - Caching                          │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Layer 2: Security Middleware       │
│  - SQL injection detection          │
│  - XSS detection                    │
│  - Bot detection                    │
│  - Slowloris protection             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Layer 3: Application Rate Limiting │
│  - Redis-backed limits              │
│  - Suspicious IP tracking           │
│  - Auto-blocking                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Layer 4: Resource Limits           │
│  - Container CPU/memory limits      │
│  - Security hardening               │
│  - Network optimization             │
└─────────────────────────────────────┘
```

## 📈 Monitoring Commands

```bash
# Real-time monitoring
./scripts/monitor-ddos.sh

# Watch nginx logs
docker logs -f nginx_proxy

# Watch application logs
docker logs -f backend-service

# Check rate limits in Redis
docker exec -it <redis-container> redis-cli
> KEYS rl:*
> GET rl:general:<IP>

# Check container health
docker ps
docker stats

# Check nginx cache
docker exec nginx_proxy du -sh /var/cache/nginx
```

## 🔍 Log Analysis

```bash
# Count 429 responses (rate limited)
docker logs nginx_proxy --since 1h | grep -c " 429 "

# Count 403 responses (blocked)
docker logs nginx_proxy --since 1h | grep -c " 403 "

# Top user agents
docker logs nginx_proxy --since 1h | awk -F'"' '{print $6}' | sort | uniq -c | sort -rn | head -10

# Top endpoints
docker logs nginx_proxy --since 1h | awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# Response time analysis
docker logs nginx_proxy --since 1h | grep "rt=" | awk '{print $NF}' | sed 's/rt=//' | sort -n | tail -20
```

## ⚙️ Configuration Files

| File | Purpose | Restart Required |
|------|---------|------------------|
| `nginx.conf` | Edge protection, rate limits | `docker-compose restart nginx` |
| `rate-limit.middleware.ts` | App rate limits | Rebuild + restart |
| `security.middleware.ts` | Attack detection | Rebuild + restart |
| `docker-compose.prod.yaml` | Resource limits | `docker-compose up -d` |

## 🎯 Testing Protection

```bash
# Test rate limiting
for i in {1..100}; do curl -s https://api.tixin.in/api/v1/event/public; done

# Test bot blocking
curl -A "bot" https://api.tixin.in/api/v1/event/public
# Expected: 403 Forbidden

# Test SQL injection blocking
curl "https://api.tixin.in/api/v1/event/public?id=1' UNION SELECT"
# Expected: 403 Forbidden

# Load test
ab -n 1000 -c 50 https://api.tixin.in/api/v1/event/public
```

## 📞 Escalation

### Level 1: Automatic (Handled by System)
- Rate limiting
- IP blocking
- Attack pattern blocking
- Cache serving

### Level 2: Manual Intervention
- Adjust rate limits
- Manual IP blocking
- Scale resources
- Clear caches

### Level 3: Emergency
- Enable Cloudflare
- Add WAF rules
- Contact GCP support
- Implement GeoIP blocking

## 💡 Best Practices

1. **Monitor Regularly**: Run `./scripts/monitor-ddos.sh` every 5-10 minutes
2. **Review Logs Daily**: Check for attack patterns
3. **Test Protection**: Run tests weekly
4. **Update Rules**: Adjust based on traffic patterns
5. **Document Incidents**: Keep track of attacks and responses
6. **Backup Configs**: Version control all configuration files
7. **Alert Setup**: Configure alerts for high traffic/blocks
8. **Regular Updates**: Keep nginx and dependencies updated

## 🔗 Useful Links

- Full Documentation: `DDOS_PROTECTION.md`
- Monitoring Script: `scripts/monitor-ddos.sh`
- Nginx Config: `nginx.conf`
- Rate Limit Middleware: `servers/user-server/src/middlewares/rate-limit.middleware.ts`
- Security Middleware: `servers/user-server/src/middlewares/security.middleware.ts`

## 📝 Notes

- All rate limits are per IP address
- Blocked IPs auto-unblock after 1 hour
- Cache serves stale content during attacks
- Real users rarely hit limits due to burst allowances
- System designed to fail gracefully under attack

---

**Last Updated**: $(date)
**Protection Level**: 🛡️🛡️🛡️🛡️🛡️ (5/5)
