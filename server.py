from flask import Flask, render_template, request
import os, json, cv2, base64, argparse, random, requests, time
from threading import Semaphore
from flask_cors import CORS
from flask_mongoengine import MongoEngine

app = Flask(__name__, static_folder=os.getcwd() + '/templates', static_url_path='')


# Connect with database
app.config['MONGODB_SETTINGS'] = {
    'db': 'AI-Database',
    'host': 'localhost',
    'port': 27017
}

db = MongoEngine()
db.init_app(app)

# Database representation of a Model
class Model(db.Document):
    name = db.StringField()
    model_id = db.StringField(unique=True)
    embeds = db.FileField()
    thumbnail = db.StringField()
    generated_images = db.ListField(db.DictField())
    trained = db.BooleanField(default=False)
    token = db.StringField()
    version = db.StringField()

    def to_json(self):
        return {'name': self.name,
                'model_id': self.model_id,
                'embeds': self.embeds,
                'thumbnail': self.thumbnail,
                'generated_images': self.generated_images,
                'trained': self.trained,
                'token': self.token}

    def __str__(self):
        return str(self.to_json())


CORS(app)

# Config arguments
parser = argparse.ArgumentParser()
parser.add_argument('-d', '--debug', action='store_true')
parser.add_argument('-g', '--gpu-host', action='store')
parser.add_argument('-p', '--port', required=True, action='store', type=int)
parser.add_argument('-b', '--host', required=True, action='store')
args = parser.parse_args()
print("go")


# Send website
@app.route('/', methods=['GET'])
@app.route('/generate', methods=['GET'])
@app.route('/about-page', methods=['GET'])
def root():
    return render_template('index.html')

# Get models from database
@app.get('/get-trained-models')
def gtm():
    return {'models': Model.objects(trained=True, version='v2').only('name', 'model_id', 'thumbnail', 'token')}


# Semaphore used to limit concurrent requests
overload_protection = Semaphore(2)

@app.post('/generate-background')
def gen():
    prompt_text = request.json['prompt_text']
    model_id = request.json['model_id']
    num_samples = request.json['num_samples']
    steps = request.json['steps']
    try:
        # Acquire semaphore and time out after 5 minutes
        if overload_protection.acquire(timeout=300):

            # Used for debugging
            if args.debug:
                images = [base64.b64encode(cv2.imencode('.jpg', cv2.resize(cv2.imread('./src/assets/cookie.jpg'), (512, 512)))[1]).decode() for i in
                          range(num_samples)]
            else:
                # Create post request to AI server
                images = json.loads(requests.post(args.gpu_host + '/generate-background',
                                                  json={'prompt_text': prompt_text,
                                                        'num_samples': num_samples,
                                                        'steps': steps,
                                                        'embeds':
                                                            # Get model file from database
                                                            base64.b64encode(Model.objects(model_id=model_id).first()['embeds']
                                                                             .read()).decode('utf-8')
                                                        }).content.decode())['images']
        # If semaphore acquire times out return nothing
        else: images = []
    except Exception as e:
        # If there's some error return nothing
        print("exception:", e)
        images = []
    finally:
        # Give things some time to free memory
        time.sleep(3)
        overload_protection.release()

    return {'prompt_text': prompt_text, 'images': images, 'steps': steps, 'timeout': len(images) == 0}


# This function gets the generated images from the database
@app.post('/get-generated-images')
def get_gen_images():
    model_id = request.json['model_id']
    model = Model.objects(model_id=model_id).first()
    # Sort by rating
    sorted_images = sorted(model.generated_images, key=lambda x: x['rating'], reverse=True)
    return {'output': sorted_images}

# Saves input images to database
@app.post('/save-images')
def save_images():
    model_id = request.json['model_id']
    images = request.json['images']
    prompt_text = request.json['prompt_text']

    model = Model.objects(model_id=model_id).first()
    model.update(
        add_to_set__generated_images=list(map(lambda image: {'image_id': str(random.random()), 'image': image['image'],
                                                             'prompt_text': prompt_text, 'rating': image['rating'],
                                                             'steps': image['steps']}, images)))
    return {"msg": 'ok!'}

# Deletes selected model from database
@app.post('/delete-image')
def del_image():
    model = Model.objects(model_id=request.json['model_id']).first()
    for i, image in enumerate(model.generated_images):
        if image['image_id'] == request.json['image_id']:
            del model.generated_images[i]
            break
    model.save()
    return {'msg': "deleted :)"}

# This function can be called from the below main block to manually add new models to the database
def create_new_model(name, model_id, token, thumbnail_path, embeds_path, trained=False, thumbnail_size=None, version='v2'):
    thumbnail = cv2.imread(thumbnail_path)

    # We make sure to keep thumbnail size small
    # If we don't it can take a really long time to load models on the homepage
    if thumbnail_size:
        thumbnail = cv2.resize(thumbnail, thumbnail_size)
    else:
        thumbnail = cv2.resize(thumbnail, (int(thumbnail.shape[1] / 4), int(thumbnail.shape[0] / 4)))

    thumbnail = base64.b64encode(cv2.imencode('.jpg', thumbnail)[1]).decode()
    new_model = Model(name=name, model_id=model_id, trained=trained, token=token, thumbnail=thumbnail, version=version)
    new_model.embeds.put(open(embeds_path, 'rb'), content_type='application/octet-stream', filename=model_id + '.model')
    new_model.save()

# Run server
if __name__ == "__main__":
    app.run(port=args.port, host=args.host)
