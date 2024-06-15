@echo off
concurrently -n "API Gateway,Auth Service,Clock Service,Mail Service" -c "yellow,cyan,magenta,green" "npx nodemon api_gateway/src/app.ts" "npx nodemon authservice/src/app.ts" "npx nodemon clock_service/src/app.ts" "npx nodemon mail_service/src/app.ts"
