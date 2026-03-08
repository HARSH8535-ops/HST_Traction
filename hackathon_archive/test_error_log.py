import urllib.request
try:
    urllib.request.urlopen("http://localhost:3000").read()
except Exception as e:
    print(e)
