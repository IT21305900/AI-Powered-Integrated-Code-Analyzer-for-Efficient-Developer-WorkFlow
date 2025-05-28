import os
import json
import re
import shutil
from datetime import datetime
from git import Repo
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
# import with OpenAI
from openai import OpenAI

# Create FastAPI app
app = FastAPI(title="Codebase Visual Aid API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = 'repos'
HISTORY_FOLDER = 'analysis_history'

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(HISTORY_FOLDER, exist_ok=True)

 Initialize OpenAI client 
try:
    # OpenAI API key
    openai_client = OpenAI(
        api_key="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"
    )
    print("✅ OpenAI client initialized successfully")
    llm = openai_client  # Keep the same variable name for compatibility
except Exception as e:
    print(f"⚠️ Warning: Could not initialize OpenAI client: {e}")
    llm = None

# Pydantic models
class AnalyzeRequest(BaseModel):
    repo_url: str

class HistoryItem(BaseModel):
    id: str
    repo_url: str
    repo_name: str
    analyzed_at: str

def sanitize(name: str) -> str:
    """Simple sanitization that works with old syntax - Flask version"""
    cleaned = (
        name.replace(" ", "_")
            .replace("-", "_")
            .replace(".", "_")
            .replace("/", "_")
            .replace("\\", "_")
            .replace("{", "_")
            .replace("}", "_")
            .replace("(", "")
            .replace(")", "")
            .replace("'", "")
            .replace('"', "")
            .replace("@", "")
            .replace("[", "")
            .replace("]", "")
            .replace(",", "")
            .strip("_")
    )
    hash_suffix = str(abs(hash(name)))[:4]
    return f"{cleaned}_{hash_suffix}"

def determine_visibility(func_name: str) -> str:
    """Determine visibility based on function naming conventions"""
    if func_name.startswith('__'):
        return '#'  # protected
    elif func_name.startswith('_'):
        return '-'  # private
    else:
        return '+'  # public

def save_analysis_to_history(repo_url: str, analysis_data: dict):
    """Save analysis results to history"""
    try:
        os.makedirs(HISTORY_FOLDER, exist_ok=True)
        
        # Create a unique identifier for this analysis
        repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        analysis_id = f"{repo_name}_{timestamp}"
        
        # Prepare history entry
        history_entry = {
            "id": analysis_id,
            "repo_url": repo_url,
            "repo_name": repo_name,
            "analyzed_at": datetime.now().isoformat(),
            "analysis_data": analysis_data
        }
        
        # Save to individual file
        history_file = os.path.join(HISTORY_FOLDER, f"{analysis_id}.json")
        with open(history_file, 'w', encoding='utf-8') as f:
            json.dump(history_entry, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Analysis saved to history: {analysis_id}")
        return analysis_id
    except Exception as e:
        print(f"❌ Error saving to history: {e}")
        return None

def load_history_data():
    """Get list of all saved analyses"""
    try:
        print(f"📂 Checking history folder: {HISTORY_FOLDER}")
        if not os.path.exists(HISTORY_FOLDER):
            print("📁 History folder does not exist, creating it...")
            os.makedirs(HISTORY_FOLDER, exist_ok=True)
            return []
        
        history_list = []
        files = os.listdir(HISTORY_FOLDER)
        print(f"📄 Found {len(files)} files in history folder")
        
        for filename in files:
            if filename.endswith('.json'):
                try:
                    file_path = os.path.join(HISTORY_FOLDER, filename)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # Only include summary info for the list
                        history_list.append({
                            "id": data["id"],
                            "repo_url": data["repo_url"],
                            "repo_name": data["repo_name"],
                            "analyzed_at": data["analyzed_at"]
                        })
                        print(f"📋 Loaded history item: {data['repo_name']}")
                except Exception as e:
                    print(f"❌ Error reading history file {filename}: {e}")
                    continue
        
        # Sort by analysis date (newest first)
        history_list.sort(key=lambda x: x["analyzed_at"], reverse=True)
        print(f"✅ Loaded {len(history_list)} history items")
        return history_list
    except Exception as e:
        print(f"❌ Error getting history: {e}")
        return []

def load_analysis_by_id(analysis_id: str):
    """Get specific analysis by ID"""
    try:
        history_file = os.path.join(HISTORY_FOLDER, f"{analysis_id}.json")
        print(f"🔍 Looking for analysis file: {history_file}")
        if not os.path.exists(history_file):
            print(f"❌ Analysis file not found: {analysis_id}")
            return None
        
        with open(history_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"✅ Loaded analysis: {analysis_id}")
            return data
    except Exception as e:
        print(f"❌ Error reading analysis {analysis_id}: {e}")
        return None

def remove_analysis_by_id(analysis_id: str):
    """Delete specific analysis by ID"""
    try:
        history_file = os.path.join(HISTORY_FOLDER, f"{analysis_id}.json")
        if os.path.exists(history_file):
            os.remove(history_file)
            print(f"🗑️ Deleted analysis: {analysis_id}")
            return True
        print(f"❌ Analysis file not found for deletion: {analysis_id}")
        return False
    except Exception as e:
        print(f"❌ Error deleting analysis {analysis_id}: {e}")
        return False

class FileTraversalAgent:
    def run(self, directory):
        file_paths = []
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    file_paths.append(os.path.join(root, file))
        return file_paths

class CodeAnalysisAgent:
    def run(self, file_paths, repo_path):
        analysis_results = {}
        try:
            repo = Repo(repo_path)
        except Exception as e:
            print(f"⚠️ Warning: Could not initialize Git repo: {e}")
            repo = None
            
        for file_path in file_paths:
            loc = 0
            last_commit = None
            funcs = set()
            libs = set()
            practices = []
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    code = f.read()
                loc = len(code.splitlines())
                
                if repo:
                    try:
                        commits = list(repo.iter_commits(paths=file_path, max_count=1))
                        last_commit = commits[0].committed_datetime.isoformat() if commits else None
                    except:
                        pass
                        
                funcs |= set(re.findall(r'function\s+([A-Za-z0-9_]+)\s*\(', code))
                funcs |= set(re.findall(r'const\s+([A-Za-z0-9_]+)\s*=\s*\(.*?\)\s*=>', code))
                libs |= set(re.findall(r'import\s+(?:.*from\s+)?[\'"]([^\'"]+)[\'"]', code))
                if re.search(r'\basync\b|\bawait\b', code): practices.append("Uses async/await")
                if re.search(r'\.then\(', code): practices.append("Uses Promises")
                if re.search(r'\buseEffect\b', code): practices.append("Uses React Hooks")
                if re.search(r'\.map\(', code): practices.append("Uses array iteration")
                if not practices: practices.append("No specific patterns detected")

                # Modified LLM analysis to use OpenAI
                category = "other"
                file_summary = "JavaScript/TypeScript file"
                
                if llm:
                    try:
                        # OpenAI API call format
                        response = llm.chat.completions.create(
                            model="gpt-3.5-turbo",  # Using GPT-3.5-turbo for cost efficiency
                            messages=[
                                {
                                    "role": "system", 
                                    "content": "You are analyzing JavaScript/TypeScript code. Classify into: Frontend/UI, Business Logic, Database/ORM, Utilities, or other. Return a short one-line summary. Respond in JSON format."
                                },
                                {
                                    "role": "user", 
                                    "content": f"Analyze this code and return JSON with 'category' and 'file_summary' fields:\n\n{code[:1000]}"
                                }
                            ],
                            max_tokens=150,
                            temperature=0.1
                        )
                        
                        # Parse OpenAI response
                        response_content = response.choices[0].message.content
                        # Try to extract JSON from response
                        try:
                            meta = json.loads(response_content)
                        except:
                            # If JSON parsing fails, try to extract from text
                            if "Frontend" in response_content or "UI" in response_content:
                                category = "Frontend/UI"
                            elif "Database" in response_content or "ORM" in response_content:
                                category = "Database/ORM"
                            elif "Business" in response_content or "Logic" in response_content:
                                category = "Business Logic"
                            elif "Utilities" in response_content or "Util" in response_content:
                                category = "Utilities"
                            meta = {"category": category, "file_summary": response_content[:100]}
                        
                        category = meta.get("category", "other")
                        file_summary = meta.get("file_summary", "JavaScript/TypeScript file")
                        
                    except Exception as e:
                        print(f"⚠️ OpenAI analysis failed for {file_path}: {e}")

                rels = re.findall(r'import\s+.*from\s+[\'"](\.[^\'"]+)[\'"]', code)
                deps = []
                for rel in rels:
                    base = os.path.normpath(os.path.join(os.path.dirname(file_path), rel))
                    for ext in ['.js', '.jsx', '.ts', '.tsx']:
                        cand = base + ext
                        if os.path.exists(cand):
                            deps.append({
                                "from": os.path.basename(file_path),
                                "to": os.path.basename(cand),
                                "path": rel
                            })
                            break

                analysis_results[file_path] = {
                    "category": category,
                    "file_summary": file_summary,
                    "functions": sorted(funcs),
                    "libraries": sorted(libs),
                    "practices": practices,
                    "metrics": {"loc": loc, "last_commit": last_commit},
                    "dependencies": deps
                }
            except Exception as e:
                print(f"❌ Error analyzing {file_path}: {e}")
                analysis_results[file_path] = {
                    "category": "other",
                    "file_summary": "Error analyzing file",
                    "functions": sorted(funcs),
                    "libraries": sorted(libs),
                    "practices": practices,
                    "metrics": {"loc": loc, "last_commit": last_commit},
                    "dependencies": []
                }

        return analysis_results

class GroupingAgent:
    def build_big_picture(self, analysis):
        files_by_cat = {}
        deps = []
        summaries = []
        for path, d in analysis.items():
            name = os.path.basename(path)
            cat = d["category"]
            desc = d["file_summary"]
            files_by_cat.setdefault(cat, []).append({
                "name": name,
                "summary": desc,
                "functions": d["functions"],
                "libraries": d["libraries"],
                "practices": d["practices"],
                "metrics": d["metrics"]
            })
            summaries.append(f"{name} => {cat}: {desc}")
            deps += d["dependencies"]

        # CHANGE 4: Modified LLM summary to use OpenAI instead of Ollama
        ov = {"overall_summary": "Code analysis completed", "key_flows": ["File analysis", "Dependency mapping"]}
        
        if llm:
            try:
                # OpenAI API call for summary
                response = llm.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are analyzing a codebase. Provide an overall summary and key flows. Respond in JSON format with 'overall_summary' and 'key_flows' fields."
                        },
                        {
                            "role": "user",
                            "content": f"Analyze these grouped files and provide summary:\n{json.dumps(summaries[:10], indent=2)}"
                        }
                    ],
                    max_tokens=300,
                    temperature=0.1
                )
                
                response_content = response.choices[0].message.content
                try:
                    p = json.loads(response_content)
                    ov["overall_summary"] = p.get("overall_summary", "Code analysis completed")
                    ov["key_flows"] = p.get("key_flows", ["File analysis", "Dependency mapping"])
                except:
                    # Fallback if JSON parsing fails
                    ov["overall_summary"] = response_content[:200] if response_content else "Code analysis completed"
                    
            except Exception as e:
                print(f"⚠️ OpenAI summary failed: {e}")

        return {
            "overall_summary": ov["overall_summary"],
            "key_flows": ov["key_flows"],
            "files_by_category": files_by_cat,
            "dependencies": deps
        }

class DiagramAgent:
    def sanitize_entity_name(self, name):
        """Sanitize entity names for Mermaid ER diagram compatibility"""
        if not name:
            return "Entity"
        
        # Remove invalid characters 
        sanitized = re.sub(r'[^\w]', '', name)  # Keep only alphanumeric and underscore
        
        # Remove leading numbers and underscores
        sanitized = re.sub(r'^[0-9_]+', '', sanitized)
        
        # Ensure it starts with a letter
        if not sanitized or not sanitized[0].isalpha():
            sanitized = f"Entity_{sanitized}" if sanitized else "Entity"
        
        # Capitalize first letter
        sanitized = sanitized.capitalize()
        
        return sanitized

    def is_valid_entity_name(self, name):
        """Check if entity name is valid for Mermaid ER diagrams"""
        if not name:
            return False
        
        # Must start with alphabetic character
        if not name[0].isalpha():
            return False
        
        # Must contain only alphanumeric, hyphens, and underscores
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9_-]*$', name):
            return False
        
        # Must not be empty or too short
        if len(name) < 2:
            return False
        
        return True

    def extract_entity_from_function(self, func_name):
        """Enhanced entity extraction from function names"""
        # Convert camelCase to words: createUser -> create User
        words = re.sub(r'([a-z])([A-Z])', r'\1 \2', func_name).split('_')
        words = [word for sublist in [w.split() for w in words] for word in sublist]
        
        crud_words = {'create', 'insert', 'save', 'update', 'delete', 'find', 'get', 'fetch', 'remove', 'by', 'all', 'new', 'add'}
        
        for word in words:
            clean_word = word.lower().strip()
            if len(clean_word) > 3 and clean_word not in crud_words and clean_word.isalpha():
                # Sanitize the extracted entity name
                sanitized = self.sanitize_entity_name(clean_word)
                if self.is_valid_entity_name(sanitized):
                    return sanitized
        return None

    def extract_entity_from_import(self, lib_path):
        """Enhanced entity extraction from import paths"""
        # Focus on specific patterns
        if '/models/' in lib_path or '/schemas/' in lib_path or '/entities/' in lib_path:
            filename = lib_path.split('/')[-1]
            entity_name = filename.replace('.js', '').replace('.ts', '').replace('Model', '').replace('Schema', '').replace('Entity', '')
            if entity_name and len(entity_name) > 2:
                sanitized = self.sanitize_entity_name(entity_name)
                if self.is_valid_entity_name(sanitized):
                    return sanitized
        return None

    def analyze_database_files(self, analysis):
        """Analyze files categorized as database-related"""
        database_entities = set()
        
        for path, data in analysis.items():
            if data.get('category') in ['Database/ORM', 'Database']:
                # This file is likely a model/schema
                filename = os.path.splitext(os.path.basename(path))[0]
                # Clean up common suffixes
                clean_name = re.sub(r'(Model|Schema|Entity|Repository)$', '', filename, flags=re.IGNORECASE)
                if clean_name and len(clean_name) > 2:
                    sanitized = self.sanitize_entity_name(clean_name)
                    if self.is_valid_entity_name(sanitized):
                        database_entities.add(sanitized)
        
        return database_entities

    def generate_smart_relationships(self, entity_list, analysis):
        """Generate relationships based on actual code dependencies"""
        relationships = []
        
        # Create relationships based on common patterns
        for i, entity in enumerate(entity_list):
            entity_lower = entity.lower()
            
            # Look for actual code relationships
            for path, data in analysis.items():
                if entity_lower in path.lower():
                    for dep in data.get('dependencies', []):
                        target_entity = next((e for e in entity_list if e.lower() in dep['to'].lower()), None)
                        if target_entity and target_entity != entity:
                            relationships.append(f"  {entity} ||--o| {target_entity} : references")
        
        # If no relationships found, create logical ones
        if not relationships:
            for i in range(len(entity_list) - 1):
                from_entity = entity_list[i]
                to_entity = entity_list[i + 1]
                
                # Determine relationship type based on entity names
                if 'user' in from_entity.lower() and 'order' in to_entity.lower():
                    relationships.append(f"  {from_entity} ||--o{{ {to_entity} : places")
                elif 'order' in from_entity.lower() and 'product' in to_entity.lower():
                    relationships.append(f"  {from_entity} }}o--|| {to_entity} : contains")
                elif 'category' in from_entity.lower() and 'product' in to_entity.lower():
                    relationships.append(f"  {from_entity} ||--o{{ {to_entity} : categorizes")
                else:
                    relationships.append(f"  {from_entity} ||--o| {to_entity} : relates")
        
        return relationships

    def generate_entity_definition(self, entity):
        """Generate entity definition with smart field assignment"""
        lines = [f"  {entity} {{"]
        lines.append(f"    int id PK")
        lines.append(f"    string name")
        lines.append(f"    datetime created_at")
        lines.append(f"    datetime updated_at")
        
        # Add entity-specific fields based on name
        entity_lower = entity.lower()
        if 'user' in entity_lower:
            lines.append(f"    string email UK")
            lines.append(f"    string password")
            lines.append(f"    string first_name")
            lines.append(f"    string last_name")
        elif 'order' in entity_lower:
            lines.append(f"    decimal total")
            lines.append(f"    string status")
            lines.append(f"    int user_id FK")
        elif 'product' in entity_lower:
            lines.append(f"    string description")
            lines.append(f"    decimal price")
            lines.append(f"    int category_id FK")
            lines.append(f"    int stock_quantity")
        elif 'category' in entity_lower:
            lines.append(f"    string description")
            lines.append(f"    string slug")
        elif 'payment' in entity_lower:
            lines.append(f"    decimal amount")
            lines.append(f"    string method")
            lines.append(f"    string status")
            lines.append(f"    int order_id FK")
        else:
            lines.append(f"    string description")
            lines.append(f"    string status")
        
        lines.append(f"  }}")
        return lines

    def generate_class_diagram(self, analysis):
        # OLD SIMPLE SYNTAX - FLASK VERSION
        lines = ["classDiagram", "%% UML Class Diagram - Standards Compliant"]
        
        # Define all classes with simple formatting
        for path, d in analysis.items():
            cls = sanitize(os.path.splitext(os.path.basename(path))[0])
            
            lines.append(f"class {cls} {{")
            lines.append(f"  -fileName : string")
            lines.append(f"  -loc : int")
            lines.append(f"  -category : string")
            if d["libraries"]:
                lines.append(f"  -dependencies : List~string~")
            if d["practices"]:
                lines.append(f"  -practices : List~string~")
            
            # Add methods
            if d["functions"]:
                for fn in d["functions"]:
                    visibility = determine_visibility(fn)
                    lines.append(f"  {visibility}{fn}(params : any) : any")
            else:
                lines.append("  +getInfo() : string")
            
            lines.append(f"  +getLOC() : int")
            lines.append(f"  +getCategory() : string")
            lines.append("}")
        
        # OLD SIMPLE RELATIONSHIPS -  FLASK VERSION
        for path, d in analysis.items():
            src = sanitize(os.path.splitext(os.path.basename(path))[0])
            for dep in d["dependencies"]:
                dst = sanitize(os.path.splitext(dep["to"])[0])
                # SIMPLE ARROW SYNTAX
                lines.append(f"{src} --> {dst} : imports")
        
        # OLD SIMPLE STYLING - FLASK VERSION
        class_colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57", "#ff9ff3", "#54a0ff", "#5f27cd"]
        class_index = 0
        for path, d in analysis.items():
            cls = sanitize(os.path.splitext(os.path.basename(path))[0])
            color = class_colors[class_index % len(class_colors)]
            lines.append(f"style {cls} fill:{color},stroke:#333,stroke-width:3px,color:#000")
            class_index += 1
        
        return "\n".join(lines)

    def generate_component_diagram(self, analysis):
        # OLD SIMPLE SYNTAX - LIKE YOUR FLASK VERSION
        lines = ["classDiagram", "%% UML Component Diagram - Standards Compliant"]
        seen = set()
        
        # Define all components with simple formatting
        for path, d in analysis.items():
            cat = d["category"]
            cid = sanitize(cat)
            if cid not in seen:
                lines.append(f"class {cid} {{")
                lines.append(f"  -type : Component")
                lines.append(f"  -role : {cat}")
                
                file_count = sum(1 for p, data in analysis.items() if data["category"] == cat)
                lines.append(f"  -fileCount : int")
                
                lines.append(f"  +getFiles() : List~File~")
                lines.append(f"  +getFileCount() : int")
                lines.append(f"  +getRole() : string")
                lines.append("}")
                seen.add(cid)
                
                # SIMPLE NOTE SYNTAX
                lines.append(f"note for {cid} \"Component: {cat}\\nFiles: {file_count}\"")
        
        # OLD SIMPLE RELATIONSHIPS
        added_relations = set()
        for path, d in analysis.items():
            src_c = sanitize(d["category"])
            for dep in d["dependencies"]:
                for p2, d2 in analysis.items():
                    if os.path.basename(p2) == dep["to"]:
                        dst_c = sanitize(d2["category"])
                        relation_key = f"{src_c}_{dst_c}"
                        if src_c != dst_c and relation_key not in added_relations:
                            # SIMPLE ARROW SYNTAX
                            lines.append(f"{src_c} --> {dst_c} : depends")
                            added_relations.add(relation_key)
                        break
        
        # OLD SIMPLE STYLING
        component_colors = {
            "Database": "#ff6b6b",
            "Frontend": "#4ecdc4", 
            "Business": "#45b7d1",
            "Utilities": "#96ceb4",
            "other": "#feca57"
        }
        
        for path, d in analysis.items():
            cat = d["category"]
            cid = sanitize(cat)
            if cid in seen:
                color = component_colors.get(cat.split("/")[0], component_colors["other"])
                lines.append(f"style {cid} fill:{color},stroke:#333,stroke-width:3px,color:#000")
        
        return "\n".join(lines)

    def generate_er_diagram(self, analysis):
        """Enhanced ER diagram generation with better pattern detection and sanitization"""
        lines = ["erDiagram", "%% Entity-Relationship Diagram from Code Analysis"]
        
        entities = set()
        
        # Method 1: Analyze database category files
        database_entities = self.analyze_database_files(analysis)
        entities.update(database_entities)
        
        # Method 2: Enhanced function name analysis
        for path, data in analysis.items():
            for func in data.get("functions", []):
                entity = self.extract_entity_from_function(func)
                if entity:
                    entities.add(entity)
        
        # Method 3: Enhanced import analysis
        for path, data in analysis.items():
            for lib in data.get("libraries", []):
                entity = self.extract_entity_from_import(lib)
                if entity:
                    entities.add(entity)
        
        # Method 4: Look for common database patterns in file names
        for path, data in analysis.items():
            filename = os.path.splitext(os.path.basename(path))[0].lower()
            if any(pattern in filename for pattern in ['model', 'schema', 'entity', 'table']):
                # Extract entity name and SANITIZE IT
                clean_name = filename.replace('model', '').replace('schema', '').replace('entity', '').replace('table', '')
                clean_name = self.sanitize_entity_name(clean_name)
                if clean_name and len(clean_name) > 2 and self.is_valid_entity_name(clean_name):
                    entities.add(clean_name.capitalize())
        
        # Filter out invalid entity names
        valid_entities = set()
        for entity in entities:
            sanitized = self.sanitize_entity_name(entity)
            if self.is_valid_entity_name(sanitized):
                valid_entities.add(sanitized)
        
        # Fallback: Create common entities if none found
        if not valid_entities:
            valid_entities.update(['User', 'Product', 'Order', 'Category', 'Payment'])
        
        # Generate entity definitions with smarter field assignment
        entity_list = list(valid_entities)[:8]  # Limit to 8 entities for readability
        
        print(f"🔍 Generated valid entities: {entity_list}")  # Debug line
        
        for entity in entity_list:
            entity_lines = self.generate_entity_definition(entity)
            lines.extend(entity_lines)
        
        # Generate relationships based on actual dependencies
        relationships = self.generate_smart_relationships(entity_list, analysis)
        lines.extend(relationships)
        
        result = "\n".join(lines)
        print(f"🔍 Generated ER diagram ({len(lines)} lines):")  # Debug line
        print(result[:500] + "..." if len(result) > 500 else result)  # Debug line
        return result

# =================== FASTAPI ROUTES ===================

@app.get("/")
async def index():
    print("🏠 Root endpoint accessed")
    return {
        "message": "Codebase Visual Aid API",
        "status": "running",
        "version": "1.0.0",
        "llm_provider": "OpenAI",  # CHANGE 5: Updated to show OpenAI
        "endpoints": [
            "GET / - API status",
            "POST /analyze - Analyze repository",
            "GET /history - Get analysis history",
            "GET /history/{id} - Get specific analysis",
            "DELETE /history/{id} - Delete analysis"
        ]
    }

@app.get("/history", response_model=List[HistoryItem])
async def get_history():
    """Get list of all saved analyses"""
    try:
        print("📚 History endpoint accessed - GET /history")
        history_data = load_history_data()
        print(f"📋 Returning {len(history_data)} history items")
        return history_data
    except Exception as e:
        print(f"❌ Error in history endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        print("🔍 Analyze endpoint accessed")
        repo_url = request.repo_url
        
        if not repo_url:
            raise HTTPException(status_code=400, detail="Missing repo_url")
            
        print(f"📥 Analyzing repository: {repo_url}")
        repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git","")
        repo_path = os.path.join(UPLOAD_FOLDER, repo_name)
        
        if not os.path.exists(repo_path):
            try:
                print(f"📥 Cloning repository: {repo_url}")
                Repo.clone_from(repo_url, repo_path)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to clone repository: {str(e)}")

        print(f"🔍 Analyzing repository: {repo_path}")
        files = FileTraversalAgent().run(repo_path)
        print(f"📄 Found {len(files)} files")
        
        analysis = CodeAnalysisAgent().run(files, repo_path)
        pic = GroupingAgent().build_big_picture(analysis)
        diag = DiagramAgent()

        analysis_data = {
            **pic,
            "class_diagram": diag.generate_class_diagram(analysis),
            "component_diagram": diag.generate_component_diagram(analysis),
            "er_diagram": diag.generate_er_diagram(analysis),  # Enhanced ER diagram with sanitization
        }
        
        # Save to history
        analysis_id = save_analysis_to_history(repo_url, analysis_data)
        if analysis_id:
            analysis_data["analysis_id"] = analysis_id

        print("✅ Analysis completed successfully with OpenAI")
        return analysis_data
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in analyze endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history/{analysis_id}")
async def get_history_item(analysis_id: str):
    """Get specific analysis by ID"""
    try:
        print(f"📋 Getting analysis: {analysis_id}")
        analysis = load_analysis_by_id(analysis_id)
        if analysis:
            return analysis["analysis_data"]
        else:
            raise HTTPException(status_code=404, detail="Analysis not found")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting analysis {analysis_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/history/{analysis_id}")
async def delete_history_item(analysis_id: str):
    """Delete specific analysis by ID"""
    try:
        print(f"🗑️ Deleting analysis: {analysis_id}")
        if remove_analysis_by_id(analysis_id):
            return {"message": "Analysis deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to delete analysis")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting analysis {analysis_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def cleanup():
    if os.path.exists(UPLOAD_FOLDER):
        shutil.rmtree(UPLOAD_FOLDER)

if __name__ == "__main__":
    print("🚀 Starting FastAPI server with OpenAI...")  # CHANGE 6: Updated startup message
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"📚 History folder: {HISTORY_FOLDER}")
    print("📍 Available endpoints:")
    print("   GET  / - API status")
    print("   POST /analyze - Analyze repository")
    print("   GET  /history - Get analysis history")
    print("   GET  /history/{id} - Get specific analysis")
    print("   DELETE /history/{id} - Delete analysis")
    
    print(f"\n🌐 Starting server on http://127.0.0.1:5000")
    print("🔗 Test URLs:")
    print(f"   http://127.0.0.1:5000/")
    print(f"   http://127.0.0.1:5000/history")
    print(f"   http://127.0.0.1:5000/docs - Interactive API docs")
    print("🤖 Using OpenAI for LLM analysis")  # CHANGE 7: Added OpenAI indicator
    
    try:
        uvicorn.run(app, host="127.0.0.1", port=5000, log_level="info", reload=False)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
    finally:
        cleanup()

