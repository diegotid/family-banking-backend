# Family banking backend
Backend with REST API and web scraping crontab scripts to fetch personal bank transactions

**For personal use only**

This software will only match your needs if you:
* Are an [Ibercaja](www.ibercaja.es) customer with online read access
* Have an [Afterbanks](www.afterbanks.com) account

Otherwise, you'll have to evolve the code to web scrape your own online banking website and/or bank aggregator

## Setting-up
1. Set personal values at [auth.php](https://github.com/diegotid/family-banking-backend/blob/master/conf/auth.php)
2. Set database connection data at the [docker compose file](https://github.com/diegotid/family-banking-backend/blob/master/docker-compose.yml)
3. Set database connection data at [db.php](https://github.com/diegotid/family-banking-backend/blob/master/conf/db.php)

## Deployment

### Using Docker
On your shell, from the project root folder, having [Docker](https://www.docker.com/products/docker-desktop) installed on your computer
```bash
docker compose up -d
```
will install required images, including PHP on Apache web server and MySQL database, and will import mock data on it.

Watch out ports on [docker compose file](https://github.com/diegotid/family-banking-backend/blob/master/docker-compose.yml), just in case they are already in use. Change the left one on the ports pair host:container where needed.

### Using AMP stack
1. Copy project files on the Apache web server document root or virtual host root
2. Convert [.htaccess](https://github.com/diegotid/family-banking-backend/blob/master/.htaccess) rules to Nginx directives when in Nginx web server
3. Watch out [.htaccess](https://github.com/diegotid/family-banking-backend/blob/master/.htaccess) rules possible conflicts with your virtual host configuration
4. Import [mock/database.sql](https://github.com/diegotid/family-banking-backend/blob/master/mock/database.sql) into your MySQL instance

### Production
1. Remove [mock folder](https://github.com/diegotid/family-banking-backend/tree/master/mock) when on a production environment
2. Include the following scripts in the crontab to start feeding your database
    * [ibercaja.php](https://github.com/diegotid/family-banking-backend/blob/master/ibercaja.php) for direct online banking
    * [ing.php](https://github.com/diegotid/family-banking-backend/blob/master/ing.php) for your bank aggregator
3. Set your cron times to your needs so your source's APIs don't ban your scripts. In my case, it's 30 minutes for Ibercaja and 1 hour for Afterbanks
4. Setup HTTPS with a valid certificate and add the following rule to [.htaccess](https://github.com/diegotid/family-banking-backend/blob/master/.htaccess)\
```
RewriteCond %{SERVER_PORT} 80 
RewriteRule ^(.*)$ https://www.yourdomain.com/$1 [R,NC,N]
```

## Testing
1. Import the localhost [mock/postman_environment.json](https://github.com/diegotid/family-banking-backend/blob/master/mock/postman_environment.json) into [Postman](https://www.postman.com)\
Change the host environment variable to host:port in case you changed port 80 on the [docker compose file](https://github.com/diegotid/family-banking-backend/blob/master/docker-compose.yml)
2. Import the requests [mock/postman_collection.json](https://github.com/diegotid/family-banking-backend/blob/master/mock/postman_collection.json) into [Postman](https://www.postman.com)
3. Use the api/login endpoint prior to any other request to get authorized (it sets the token variable value in the environment)

