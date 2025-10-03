#!/bin/bash
# DDoS Monitoring Script
# Usage: ./scripts/monitor-ddos.sh

echo "=== DDoS Protection Monitoring ==="
echo "Timestamp: $(date)"
echo ""

# Check if running in Docker
if ! command -v docker &> /dev/null; then
    echo "Error: Docker not found"
    exit 1
fi

# 1. Check Nginx connections
echo "📊 Nginx Connection Stats:"
NGINX_CONN=$(docker exec nginx_proxy netstat -an 2>/dev/null | grep :443 | wc -l)
echo "  Active HTTPS connections: $NGINX_CONN"
if [ "$NGINX_CONN" -gt 1000 ]; then
    echo "  ⚠️  WARNING: High connection count!"
fi
echo ""

# 2. Check rate limit violations (last 5 minutes)
echo "🚫 Rate Limit Violations (last 5 min):"
RATE_LIMIT_COUNT=$(docker logs nginx_proxy --since 5m 2>/dev/null | grep -c "limiting requests")
echo "  Total violations: $RATE_LIMIT_COUNT"
if [ "$RATE_LIMIT_COUNT" -gt 100 ]; then
    echo "  ⚠️  WARNING: High rate limit violations!"
fi
echo ""

# 3. Check blocked IPs
echo "🔒 Blocked IPs (last 5 min):"
BLOCKED_COUNT=$(docker logs backend-service --since 5m 2>/dev/null | grep -c "blocked\|Blocked")
echo "  Total blocks: $BLOCKED_COUNT"
if [ "$BLOCKED_COUNT" -gt 50 ]; then
    echo "  ⚠️  WARNING: High block count - possible attack!"
fi
echo ""

# 4. Check attack pattern detections
echo "🎯 Attack Detections (last 5 min):"
SQL_INJECT=$(docker logs backend-service --since 5m 2>/dev/null | grep -c "SQL injection")
XSS_ATTEMPT=$(docker logs backend-service --since 5m 2>/dev/null | grep -c "XSS attempt")
BOT_BLOCK=$(docker logs backend-service --since 5m 2>/dev/null | grep -c "bot/scraper")
echo "  SQL Injection attempts: $SQL_INJECT"
echo "  XSS attempts: $XSS_ATTEMPT"
echo "  Bot blocks: $BOT_BLOCK"
echo ""

# 5. Check cache performance
echo "💾 Cache Performance (last 100 requests):"
CACHE_HIT=$(docker logs nginx_proxy --tail 100 2>/dev/null | grep "X-Cache-Status: HIT" | wc -l)
CACHE_MISS=$(docker logs nginx_proxy --tail 100 2>/dev/null | grep "X-Cache-Status: MISS" | wc -l)
if [ $((CACHE_HIT + CACHE_MISS)) -gt 0 ]; then
    CACHE_RATIO=$((CACHE_HIT * 100 / (CACHE_HIT + CACHE_MISS)))
    echo "  Cache hit ratio: ${CACHE_RATIO}%"
    if [ "$CACHE_RATIO" -lt 50 ]; then
        echo "  ⚠️  WARNING: Low cache hit ratio!"
    fi
else
    echo "  No cache data available"
fi
echo ""

# 6. Check container resource usage
echo "💻 Container Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "NAME|backend|nginx|worker"
echo ""

# 7. Check for security alerts
echo "🚨 Security Alerts (last 5 min):"
SECURITY_ALERTS=$(docker logs backend-service --since 5m 2>/dev/null | grep -c "SECURITY ALERT")
echo "  Total security alerts: $SECURITY_ALERTS"
if [ "$SECURITY_ALERTS" -gt 10 ]; then
    echo "  ⚠️  CRITICAL: Multiple security alerts detected!"
    echo ""
    echo "Recent alerts:"
    docker logs backend-service --since 5m 2>/dev/null | grep "SECURITY ALERT" | tail -5
fi
echo ""

# 8. Top IPs by request count
echo "🌐 Top 10 IPs (last 5 min):"
docker logs nginx_proxy --since 5m 2>/dev/null | \
    awk '{print $1}' | \
    sort | uniq -c | \
    sort -rn | \
    head -10 | \
    awk '{printf "  %s requests from %s\n", $1, $2}'
echo ""

# 9. Response time check
echo "⏱️  Response Time Check:"
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' https://api.tixin.in/health)
echo "  Health endpoint: ${RESPONSE_TIME}s"
if (( $(echo "$RESPONSE_TIME > 1.0" | bc -l) )); then
    echo "  ⚠️  WARNING: Slow response time!"
fi
echo ""

# 10. Overall status
echo "📈 Overall Status:"
if [ "$NGINX_CONN" -lt 1000 ] && [ "$RATE_LIMIT_COUNT" -lt 100 ] && [ "$SECURITY_ALERTS" -lt 10 ]; then
    echo "  ✅ System operating normally"
else
    echo "  ⚠️  System under stress - review warnings above"
fi
echo ""

echo "=== End of Report ==="
echo "Run this script regularly or set up as a cron job"
echo "For real-time monitoring: docker logs -f nginx_proxy"
