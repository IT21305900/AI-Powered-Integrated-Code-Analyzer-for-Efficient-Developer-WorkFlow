import pickle
import json
import os
import shutil
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import AzureOpenAI
from git import Repo
from pymongo import MongoClient
import time

load_dotenv()

# Constants
MODEL_PATH = "code_smell_model.pkl"
VECTORIZER_PATH = "tfidf_vectorizer.pkl"
REPOS_DIR = "./repositories"
MONGO_URI = os.getenv('MONGO_URI')  # MongoDB URI (e.g., mongodb://localhost:27017)
DB_NAME = 'code_analysis_db'
COLLECTION_NAME = 'analysis_results'

# Load ML Model and Vectorizer
with open(MODEL_PATH, 'rb') as model_file:
    model = pickle.load(model_file)

with open(VECTORIZER_PATH, 'rb') as vectorizer_file:
    vectorizer = pickle.load(vectorizer_file)

# Azure OpenAI Client
client_2 = AzureOpenAI(
    azure_endpoint=os.getenv('azure_endpoint_mini'),
    api_key=os.getenv('api_key_mini'),
    api_version=os.getenv('api_version_mini')
)

# MongoDB Client Setup
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

custom_function_1 = [{
    "name": "get_suggestions",
    "description": "Identify the line number of the code smell give suggestions to improve the code",
    "parameters": {
        "type": "object",
        "properties": {
            "suggestion": {
                "type": "string",
            },
            "line_number": {
                "type": "string",
                "description": "Identify the line numbers which has issue in the code"
            },
        },
        "required": ["suggestion", "line_number"]
    }
}]

app = Flask(__name__)
CORS(app)

# Function to predict code smells
def predict_code_smell(code_snippet):
    input_tfidf = vectorizer.transform([code_snippet])
    prediction = model.predict(input_tfidf)[0]
    return prediction

def get_gpt_suggestion(text,smell_type, max_retries=1):

    retries = 0
    combined_response ={}
    while retries < max_retries:
        try:
            response = client_2.chat.completions.create(
                model="ESPIS-LK-PRE-04-4omini",
                messages=[
                    {"role": "system",
                     "content": f"You are a JavaScript expert providing best coding practices. The following JavaScript code has been identified with a code smell: {smell_type}. Provide a brief explanation of the issue and suggest an improved version of the code."},
                    {"role": "user", "content": text}
                ],
                functions=custom_function_1,
            )
            #print(response)
            function_called = response.choices[0].message.function_call.name
            function_args = json.loads(response.choices[0].message.function_call.arguments)

            combined_response[function_called] = function_args  # Ensure correct format
            data_2 = combined_response.get("get_suggestions", {})
            return data_2
        except AttributeError as e:
            print(f"Error processing response (Attempt {retries + 1}/{max_retries}): {e}")
            retries += 1
            time.sleep(2)  # Wait before retrying

    print(f"Skipping page due to repeated failures after {max_retries} attempts.")
    return {"suggestion": "No issues in the code", "line_number": "None"}  # Return empty list and unknown level if it fails after retries                                                       
def analyze_code():
    try:
        data = request.get_json()
        repo_url = data.get('repo_url') or data.get('repoUrl')

        if not repo_url:
            return jsonify({"error": "No repository URL provided"}), 400

        repo_name = repo_url.split("/")[-1].replace(".git", "")
        repo_path = f"{REPOS_DIR}/{repo_name}"

        # Clone repository
        shutil.rmtree(repo_path, ignore_errors=True)
        Repo.clone_from(repo_url, repo_path)
        
        # Extract JavaScript files
        js_files = []
        for root, _, files in os.walk(repo_path):
            for file in files:
                if file.endswith(".js"):
                    js_files.append(os.path.join(root, file))
        
        if not js_files:
            return jsonify({"error": "No JavaScript files found in the repository"}), 404
        
        # Analyze each JS file
        analysis_results = []
        for js_file in js_files:
            with open(js_file, "r", encoding="utf-8") as file:
                code_snippet = file.read()
                smell_type = predict_code_smell(code_snippet)
                
                    main_type = "Implementation smell"
                    main_type = "Design smell"
                else:
                    main_type = "Good smell"
                if smell_type != "good_smell":
                    suggestions = get_gpt_suggestion(code_snippet, smell_type)
                    # print(suggestion)
                    suggestion = suggestions['suggestion']
                    line_number = suggestions['line_number']
                    if suggestion =="No issues in the code" and line_number == "None":
                        smell_type = "good_smell"
                        main_type = "Good smell"

                else:
                    suggestion = "No issues in the code"
                    line_number = "None"
                    smell_type = "good_smell"
                    main_type = "Good smell"
                    
                
                
                
                analysis_results.append({
                    "file": js_file,
                    "smell": smell_type,
                    "suggestion": suggestion ,
                    "line_number": line_number,
                    "main_type": main_type
                })
        
        # Save analysis results to MongoDB
        collection.insert_one({
            "repo_url": repo_url,
            "analysis_results": analysis_results,
            "timestamp": json.dumps(data.get('timestamp'))  # Optional field for storing when the analysis was done
        })

        return jsonify({"repository": repo_url, "analysis": analysis_results}), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    os.makedirs(REPOS_DIR, exist_ok=True)
    app.run(port=5001, debug=True)
