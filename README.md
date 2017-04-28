# Earthquake Details Webservice

FDSN extension services provided by the U.S. Geological Survey. These
services augment summary-level search results with data otherwise not
readily available.

## Installation

### Run Locally

There are three steps to running the application locally:
 - Install dependencies
 - Configure
 - Start

These steps are completed with the following commands (note, output from each
command is not shown here).
```
$ cd .../earthquake-details-ws
$ npm install
$ npm run configure
$ npm start
```

### Run with Docker

There are two steps to running the application in Docker:
 - Build
 - Configure
 - Start

These steps are completed with the following commands (note, output from each
commadn is not shown here).
```
$ cd .../earthquake-details/ws
$ docker build -t usgs/earthquake-details-ws:latest .
$ $EDITOR docker-compose.yml
$ docker-compose up -d
```
> Note: When creating the docker-compose.yml file, you should specify the
> necessary configuration values in INI format. See docker-compose.yml for
> details.
