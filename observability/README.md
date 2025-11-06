# Observability Stack

This setup provides comprehensive monitoring for your production environment using:

## Components

- **Prometheus** (port 9090): Metrics collection and storage
- **Grafana** (port 3000): Visualization and dashboards
- **Loki** (port 3100): Log aggregation
- **Promtail**: Log shipping to Loki
- **Node Exporter** (port 9100): System metrics
- **cAdvisor** (port 8080): Container metrics

## Access URLs

- Grafana: https://your-domain:3000 (admin/admin123)
- Prometheus: https://your-domain:9090
- cAdvisor: https://your-domain:8080

## What's Monitored

### Metrics
- System CPU, memory, disk usage
- Container resource usage
- Application metrics (if your app exposes /metrics endpoint)
- Nginx status and performance

### Logs
- All container logs via Docker log driver
- System logs
- Nginx access and error logs

## Getting Started

1. Start the stack:
   ```bash
   docker-compose -f docker-compose.prod.yaml up -d
   ```

2. Access Grafana at port 3000 with admin/admin123

3. The dashboard "Application Monitoring" is pre-configured

## Security Notes

- Change the default Grafana password in production
- Consider adding authentication to Prometheus
- Restrict access to monitoring ports via firewall
- The nginx status endpoint is restricted to the docker network

## Data Retention

- Prometheus: 15 days
- Loki: Default retention (check loki-config.yml)
- Grafana: Persistent storage via Docker volumes