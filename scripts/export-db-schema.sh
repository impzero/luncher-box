#!/bin/sh
echo 'Enter db username:'
read name

echo 'Enter db name:'
read db_name

echo 'Enter schema dump name:'
read schema_name

mkdir -p ../sql
mysqldump -u $name -p -B $db_name -d > ../sql/"$schema_name"
