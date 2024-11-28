from azure.ai.ml.entities import ManagedOnlineEndpoint, ManagedOnlineDeployment

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
