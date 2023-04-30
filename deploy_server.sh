ng build --configuration="production" --build-optimizer

ln -sf $(pwd)/dist/ai-backgrounds/index.html templates/index.html

sudo python3 server.py -g $1 -b "192.168.0.20" -p 80
