# Python script to create the required .py files with the provided code snippets

# Define the code snippets for each file
connect_to_workspace_code = """from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential

# Replace with your subscription ID, resource group name, and workspace name
subscription_id = "your-subscription-id"
resource_group = "your-resource-group"
workspace_name = "your-workspace-name"

ml_client = MLClient(
    credential=DefaultAzureCredential(),
    subscription_id=subscription_id,
    resource_group_name=resource_group,
    workspace_name=workspace_name
)
"""

register_model_code = """from azure.ai.ml.entities import Model

model = Model(
    path="path/to/your/model",
    name="facial_emotion_model",
    description="A Keras model for facial emotion detection",
    type="custom_model"
)

ml_client.models.create_or_update(model)
"""

score_code = """import json
import numpy as np
import cv2
from keras.models import model_from_json

def init():
    global model
    model_path = "facialemotionmodel.json"
    weights_path = "facialemotionmodel.h5"
    
    with open(model_path, "r") as json_file:
        model_json = json_file.read()
    model = model_from_json(model_json)
    model.load_weights(weights_path)

def run(raw_data):
    data = np.array(json.loads(raw_data)["data"])
    prediction = model.predict(data)
    return json.dumps({"prediction": prediction.tolist()})
"""

deploy_model_code = """from azure.ai.ml.entities import ManagedOnlineEndpoint, ManagedOnlineDeployment

# Create an endpoint
endpoint = ManagedOnlineEndpoint(
    name="facial-emotion-endpoint",
    auth_mode="key"
)
ml_client.online_endpoints.create_or_update(endpoint)

# Create a deployment
deployment = ManagedOnlineDeployment(
    name="facial-emotion-deployment",
    endpoint_name=endpoint.name,
    model=model,
    instance_type="Standard_DS3_v2",
    instance_count=1,
    scoring_script="score.py"
)
ml_client.online_deployments.create_or_update(deployment)
"""

test_deployment_code = """import requests
import json

# Replace with your endpoint URL and key
endpoint_url = "your-endpoint-url"
key = "your-endpoint-key"

headers = {"Authorization": f"Bearer {key}"}
data = json.dumps({"data": [[...]]})  # Replace with your test data

response = requests.post(endpoint_url, headers=headers, data=data)
print(response.json())
"""

# Function to create a .py file with the given filename and code content
def create_py_file(filename, code_content):
    with open(filename, 'w') as file:
        file.write(code_content)

# Create the .py files with the provided code snippets
create_py_file('connect_to_workspace.py', connect_to_workspace_code)
create_py_file('register_model.py', register_model_code)
create_py_file('score.py', score_code)
create_py_file('deploy_model.py', deploy_model_code)
create_py_file('test_deployment.py', test_deployment_code)

print("Python scripts have been created successfully.")
