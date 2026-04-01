"""
Netlify Function handler for H. pylori Detection API
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import the FastAPI app
from main import app

# Netlify Functions handler
def handler(event, context):
    """Netlify function handler"""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from fastapi import Request
    from fastapi.responses import JSONResponse
    import json

    # Create a test client for the app
    client = TestClient(app)

    # Get the path and method
    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    body = event.get('body', '')

    # Handle CORS preflight
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            'body': ''
        }

    # Build the request to FastAPI
    try:
        if method == 'GET':
            response = client.get(path, headers=headers)
        elif method == 'POST':
            response = client.post(path, json=json.loads(body) if body else {}, headers=headers)
        elif method == 'PUT':
            response = client.put(path, json=json.loads(body) if body else {}, headers=headers)
        elif method == 'DELETE':
            response = client.delete(path, headers=headers)
        else:
            response = client.get(path)

        return {
            'statusCode': response.status_code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Content-Type': 'application/json',
            },
            'body': json.dumps(response.json()) if response.json() else ''
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({'error': str(e)})
        }