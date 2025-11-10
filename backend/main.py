import os.path

from flask import Flask
from flask_cors import CORS
from routes import api

app = Flask(__name__, 
           template_folder='../frontend',
           static_folder='../frontend/static')

# Enable CORS for all routes
CORS(app)

app.register_blueprint(api)


if __name__ == '__main__':
    # Определяем путь к data относительно корня проекта
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    app.run(host='0.0.0.0', port=8081)
