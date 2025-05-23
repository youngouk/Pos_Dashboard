#!/usr/bin/env python3
"""
Simple health check test for the backend
"""

import requests
import sys
import time

def test_health_endpoint(base_url="http://localhost:8000"):
    """Test the health endpoint"""
    try:
        print(f"Testing health endpoint at {base_url}/health")
        response = requests.get(f"{base_url}/health", timeout=10)
        
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed with error: {e}")
        return False

def test_root_endpoint(base_url="http://localhost:8000"):
    """Test the root endpoint"""
    try:
        print(f"Testing root endpoint at {base_url}/")
        response = requests.get(f"{base_url}/", timeout=10)
        
        if response.status_code == 200:
            print("✅ Root endpoint check passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Root endpoint check failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Root endpoint check failed with error: {e}")
        return False

if __name__ == "__main__":
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    print(f"Testing backend at {base_url}")
    print("=" * 50)
    
    # Wait a bit for server to start
    time.sleep(2)
    
    health_ok = test_health_endpoint(base_url)
    root_ok = test_root_endpoint(base_url)
    
    if health_ok and root_ok:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1) 