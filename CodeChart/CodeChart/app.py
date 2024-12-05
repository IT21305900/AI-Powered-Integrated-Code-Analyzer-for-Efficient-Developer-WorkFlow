import os
import json
import networkx as nx
import matplotlib.pyplot as plt
from collections import defaultdict
from git import Repo
import math
from llama_index.llms.ollama import Ollama
from llama_index.core.llms import ChatMessage
from llama_index.core.bridge.pydantic import BaseModel

# Initialize Ollama with Llama 3.1
llm = Ollama(model="llama3.1:latest", request_timeout=120.0, json_mode=True)

# Define a Pydantic model for structured outputs
class Song(BaseModel):
    name: str
    artist: str

# Define Agent Classes
class FileTraversalAgent:
    def run(self, directory):
        file_paths = []
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    full_path = os.path.join(root, file)
                    file_paths.append(full_path)
        return file_paths

class CodeAnalysisAgent:
    def run(self, file_paths):
        analysis_results = {}
        for file_path in file_paths:
            print(f"Analyzing {file_path}...")
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()
                
            try:
                prompt = f"""
                    Analyze the following Next.js code and extract:
                    - All function and component definitions with their names.
                    - All imports and the files/modules they import from.
                    - Any database interactions.
                    Provide the information in the following JSON format:
                    {{
                        "functions": ["functionName1", "functionName2", ...],
                        "imports": [{{"from": "moduleName", "imported": ["item1", "item2"]}}, ...],
                        "database_calls": ["dbCall1", "dbCall2", ...]
                    }}

                    Code:
                    {code}
                    """
                if prompt:  # Check if the prompt is non-empty
                    response = llm.complete(prompt)
                    try:
                        analysis = json.loads(str(response))
                        analysis_results[file_path] = analysis
                    except json.JSONDecodeError:
                        print(f"Failed to parse analysis for {file_path}.")
                else:
                    print("Prompt is empty, skipping completion.")
            except Exception as e:
                print(f"Failed to generate completion due to: {e}")    

        return analysis_results

class DiagramAgent:
    def run(self, analysis_results):
        G = nx.DiGraph()
        for file_path, analysis in analysis_results.items():
            file_node = os.path.basename(file_path)
            G.add_node(file_node, type='file')

            for func in analysis.get('functions', []):
                G.add_node(func, type='function')
                G.add_edge(file_node, func)

            for imp in analysis.get('imports', []):
                from_module = imp.get('from')
                imported_items = imp.get('imported', [])
                G.add_node(from_module, type='module')
                G.add_edge(file_node, from_module)
                for item in imported_items:
                    G.add_node(item, type='imported_item')
                    G.add_edge(from_module, item)

            for db_call in analysis.get('database_calls', []):
                G.add_node(db_call, type='db_call')
                G.add_edge(file_node, db_call)

        # Define color and shape maps
        color_map = {
            'file': 'lightblue',
            'function': 'green',
            'module': 'orange',
            'imported_item': 'yellow',
            'db_call': 'red'
        }
        shape_map = {
            'file': 'o',          # circle
            'function': 's',      # square
            'module': 'H',        # hexagon
            'imported_item': 'p', # pentagon
            'db_call': 'd'        # diamond
        }
        # Define layers with their y-coordinates
        layers = {
            'file': 4,
            'function': 3,
            'module': 2,
            'imported_item': 1,
            'db_call': 0
        }

        # Group nodes by their type
        layer_nodes = defaultdict(list)
        for node, data in G.nodes(data=True):
            node_type = data['type']
            layer_nodes[node_type].append(node)

        # Assign positions
        pos = {}
        x_offsets = defaultdict(float)  # Keeps track of the current x position for each layer
        layer_order = sorted(layers.items(), key=lambda x: x[1], reverse=True)  # Highest layer first

        for node_type, y in layer_order:
            nodes = layer_nodes[node_type]
            num_nodes = len(nodes)
            if num_nodes == 0:
                continue
            # Calculate spacing based on the number of nodes
            spacing = 50  # Base spacing
            total_width = (num_nodes - 1) * spacing
            start_x = -total_width / 2  # Center the nodes
            for i, node in enumerate(sorted(nodes)):
                pos[node] = (start_x + i * spacing, y)

        plt.figure(figsize=(40, 10))  # Increased figure size for better spacing

        # Draw nodes based on type
        for node_type, shape in shape_map.items():
            nodelist = [n for n, attr in G.nodes(data=True) if attr['type'] == node_type]
            if nodelist:
                nx.draw_networkx_nodes(
                    G, pos,
                    nodelist=nodelist,
                    node_color=color_map[node_type],
                    node_shape=shape,
                    node_size=2500,
                    linewidths=1,
                    edgecolors='black'
                )

        # Draw edges with arrows
        nx.draw_networkx_edges(G, pos, arrowstyle='-|>', arrowsize=20, edge_color='gray', width=2)

        # Draw labels
        nx.draw_networkx_labels(G, pos, font_size=5, font_weight='bold')

        plt.axis('off')  # Hide axes
        plt.tight_layout()
        plt.show()

# Repository Operations
project_name="movieshub-main"
repo_url = 'https://github.com/anil-sidhu/next-js-project'

if os.path.exists(project_name):
    print("Project exists.")
else:
    try:
        Repo.clone_from(repo_url, project_name)
        print("Repository successfully cloned.")
    except Exception as e:
        print("Failed to clone the repository:", e)


# Execute Agents
file_traversal_agent = FileTraversalAgent()
code_analysis_agent = CodeAnalysisAgent()
diagram_agent = DiagramAgent()

file_paths = file_traversal_agent.run(project_name)
analysis_results = code_analysis_agent.run(file_paths)
diagram_agent.run(analysis_results)
