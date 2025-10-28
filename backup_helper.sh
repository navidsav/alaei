#/bin/bash

docker exec -i mongodb_autoalaei mongodump --gzip --archive --username root --password pass --authenticationDatabase admin > mobile_$(date +%Y_%m_%d).archive

