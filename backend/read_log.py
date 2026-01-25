with open(r'd:\streamcast\backend\seed.log', 'rb') as f:
    content = f.read()

# Try to decode as utf-16ley (PowerShell default)
try:
    print(content.decode('utf-16le'))
except:
    try:
        print(content.decode('utf-8'))
    except:
        print(content)
