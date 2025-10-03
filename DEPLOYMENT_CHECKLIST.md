# DDoS Protection Deployment Checklist

## Pre-Deployment

### 1. Backup Current Configuration
- [ ] Backup `nginx.conf`
  ```bash
  cp nginx.conf nginx.conf.backup.$(date +%Y%m%d)
  ```
- [ ] Backup `docker-compose.prod.yaml`
  ```bash
  cp docker-compose.prod.yaml docker-compose.prod.yaml.backup.$(date +%Y%m%d)
  ```
- [ ] Backup application code
  ```bash
  git commit -am "Backup before DDoS protection deployment"
  git tag pre-ddos-protection
  ```

### 2. Review Changes
- [ ] Read `SECURITY_SUMMARY.md`
- [ ] Review `nginx.conf` changes
- [ ] Review `rate-limit.middleware.ts` changes
- [ ] Review `security.middleware.ts` (new file)
- [ ] Review `docker-compose.prod.yaml` changes
- [ ] Understand rate limits and their impact

### 3. Test in Staging (if available)
- [ ] Deploy to staging environment
- [ ] Run `./scripts/monitor-ddos.sh`
- [ ] Test normal user flows
- [ ] Test rate limiting
- [ ] Test attack blocking
- [ ] Monitor for 1 hour

### 4. Prepare Rollback Plan
- [ ] Document current configuration
- [ ] Prepare rollback commands
  ```bash
  # Rollback commands
  cp nginx.conf.backup nginx.conf
  cp docker-compose.prod.yaml.backup docker-compose.prod.yaml
  docker-compose -f docker-compose.prod.yaml up -d
  ```
- [ ] Test rollback procedure

## Deployment

### 5. Schedule Maintenance Window
- [ ] Choose low-traffic time (e.g., 2-4 AM)
- [ ] Notify users (if applicable)
- [ ] Prepare team for monitoring

### 6. Deploy New Configuration
- [ ] Pull latest code
  ```bash
  git pull origin main
  ```
- [ ] Build new containers
  ```bash
  docker-compose -f docker-compose.prod.yaml build
  ```
- [ ] Deploy with minimal downtime
  ```bash
  docker-compose -f docker-compose.prod.yaml up -d
  ```
- [ ] Wait for health checks to pass
  ```bash
  docker ps  # Check all containers are healthy
  ```

### 7. Immediate Verification
- [ ] Check all containers are running
  ```bash
  docker ps
  ```
- [ ] Check nginx is responding
  ```bash
  curl -I https://api.tixin.in/health
  ```
- [ ] Check backend is responding
  ```bash
  curl https://api.tixin.in/health
  ```
- [ ] Check logs for errors
  ```bash
  docker logs nginx_proxy --tail 50
  docker logs backend-service --tail 50
  ```

## Post-Deployment

### 8. Functional Testing (First 15 Minutes)
- [ ] Test health endpoint
  ```bash
  curl https://api.tixin.in/health
  ```
- [ ] Test public API endpoints
  ```bash
  curl https://api.tixin.in/api/v1/event/public
  ```
- [ ] Test authentication
  ```bash
  curl -X POST https://api.tixin.in/api/v1/auth/otp/request \
    -H "Content-Type: application/json" \
    -d '{"identifier":"test@example.com"}'
  ```
- [ ] Test rate limiting
  ```bash
  for i in {1..100}; do curl -s https://api.tixin.in/api/v1/event/public; done
  ```
- [ ] Verify 429 responses are returned after limits

### 9. Security Testing (First 30 Minutes)
- [ ] Test bot blocking
  ```bash
  curl -A "bot" https://api.tixin.in/api/v1/event/public
  # Expected: 403 Forbidden
  ```
- [ ] Test SQL injection blocking
  ```bash
  curl "https://api.tixin.in/api/v1/event/public?id=1' UNION SELECT"
  # Expected: 403 Forbidden
  ```
- [ ] Test XSS blocking
  ```bash
  curl "https://api.tixin.in/api/v1/event/public?q=<script>alert(1)</script>"
  # Expected: 403 Forbidden
  ```
- [ ] Verify blocks are logged
  ```bash
  docker logs backend-service | grep -i "blocked"
  ```

### 10. Monitoring Setup (First Hour)
- [ ] Run monitoring script
  ```bash
  ./scripts/monitor-ddos.sh
  ```
- [ ] Check cache performance
  ```bash
  docker logs nginx_proxy | grep "X-Cache-Status"
  ```
- [ ] Monitor resource usage
  ```bash
  docker stats
  ```
- [ ] Check for any errors
  ```bash
  docker logs nginx_proxy | grep -i error
  docker logs backend-service | grep -i error
  ```

### 11. Performance Verification (First 2 Hours)
- [ ] Check response times
  ```bash
  for i in {1..10}; do
    curl -o /dev/null -s -w '%{time_total}\n' https://api.tixin.in/health
  done
  ```
- [ ] Verify cache hit ratio
  ```bash
  docker logs nginx_proxy --tail 100 | grep "X-Cache-Status: HIT" | wc -l
  ```
- [ ] Monitor CPU usage
  ```bash
  docker stats --no-stream
  ```
- [ ] Monitor memory usage
  ```bash
  docker stats --no-stream
  ```

### 12. Load Testing (First 4 Hours)
- [ ] Run light load test
  ```bash
  ab -n 1000 -c 10 https://api.tixin.in/api/v1/event/public
  ```
- [ ] Run moderate load test
  ```bash
  ab -n 5000 -c 50 https://api.tixin.in/api/v1/event/public
  ```
- [ ] Verify rate limiting works
- [ ] Check for any errors
- [ ] Monitor resource usage during load

### 13. Real User Monitoring (First 24 Hours)
- [ ] Monitor user complaints
- [ ] Check error rates
- [ ] Review rate limit violations
  ```bash
  docker logs nginx_proxy | grep "limiting requests" | wc -l
  ```
- [ ] Check blocked IPs
  ```bash
  docker logs backend-service | grep "blocked" | wc -l
  ```
- [ ] Verify no legitimate users are blocked

### 14. Documentation & Handoff
- [ ] Update team documentation
- [ ] Share monitoring script location
- [ ] Share quick reference guide
- [ ] Train team on incident response
- [ ] Set up monitoring alerts (if not done)

### 15. Ongoing Monitoring (First Week)
- [ ] Run `./scripts/monitor-ddos.sh` every 4 hours
- [ ] Review logs daily
- [ ] Check for attack patterns
- [ ] Adjust rate limits if needed
- [ ] Document any issues

## Rollback Procedure (If Needed)

### If Critical Issues Arise
1. [ ] Stop current deployment
   ```bash
   docker-compose -f docker-compose.prod.yaml down
   ```
2. [ ] Restore backup configuration
   ```bash
   cp nginx.conf.backup nginx.conf
   cp docker-compose.prod.yaml.backup docker-compose.prod.yaml
   ```
3. [ ] Rebuild and restart
   ```bash
   docker-compose -f docker-compose.prod.yaml build
   docker-compose -f docker-compose.prod.yaml up -d
   ```
4. [ ] Verify rollback
   ```bash
   curl https://api.tixin.in/health
   docker ps
   ```
5. [ ] Document issue
6. [ ] Investigate and fix
7. [ ] Re-deploy when ready

## Success Criteria

### Must Pass (Critical)
- [ ] All containers running and healthy
- [ ] Health endpoint responding < 1s
- [ ] API endpoints responding < 500ms
- [ ] No errors in logs
- [ ] Rate limiting working
- [ ] Attack blocking working
- [ ] No legitimate users blocked

### Should Pass (Important)
- [ ] Cache hit ratio > 50%
- [ ] Response times < 200ms
- [ ] CPU usage < 70%
- [ ] Memory usage < 80%
- [ ] No user complaints

### Nice to Have (Optional)
- [ ] Cache hit ratio > 80%
- [ ] Response times < 100ms
- [ ] CPU usage < 50%
- [ ] Memory usage < 60%

## Sign-Off

### Deployment Team
- [ ] DevOps Lead: _________________ Date: _______
- [ ] Backend Lead: ________________ Date: _______
- [ ] Security Lead: _______________ Date: _______

### Verification
- [ ] All tests passed
- [ ] No critical issues
- [ ] Monitoring in place
- [ ] Team trained
- [ ] Documentation complete

### Final Approval
- [ ] Approved for production: _________________ Date: _______

## Notes

### Issues Encountered
```
[Document any issues here]
```

### Adjustments Made
```
[Document any configuration adjustments]
```

### Lessons Learned
```
[Document lessons learned for future deployments]
```

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Status**: [ ] Success [ ] Partial [ ] Rollback
**Next Review**: _____________
