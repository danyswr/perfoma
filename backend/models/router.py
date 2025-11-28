from typing import Optional, Dict, Any, List
import httpx
from server.config import settings
import json

class ModelRouter:
    """Router for managing different AI models with improved error handling"""
    
    AVAILABLE_MODELS = {
        "openai/gpt-4-turbo": {
            "name": "GPT-4 Turbo",
            "provider": "openrouter",
            "context": 128000
        },
        "anthropic/claude-3-opus": {
            "name": "Claude 3 Opus",
            "provider": "openrouter",
            "context": 200000
        },
        "google/gemini-pro-1.5": {
            "name": "Gemini Pro 1.5",
            "provider": "openrouter",
            "context": 1000000
        },
        "meta-llama/llama-3-70b-instruct": {
            "name": "Llama 3 70B",
            "provider": "openrouter",
            "context": 8192
        },
        "custom": {
            "name": "Custom Model",
            "provider": "custom",
            "context": 4096
        }
    }
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)
        self.request_count = 0
        self.error_count = 0
        self.last_error = None
        
    def _validate_api_key(self) -> bool:
        """Validate OpenRouter API key format"""
        api_key = settings.OPENROUTER_API_KEY.strip() if settings.OPENROUTER_API_KEY else ""
        if not api_key:
            self.last_error = "OpenRouter API key is empty"
            return False
        if not api_key.startswith("sk-"):
            self.last_error = "OpenRouter API key format is invalid (should start with 'sk-')"
            return False
        return True
        
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available models"""
        return [
            {"id": k, **v} 
            for k, v in self.AVAILABLE_MODELS.items()
        ]
    
    async def generate(
        self,
        model_name: str,
        system_prompt: str,
        user_message: str,
        context: Optional[List[Dict]] = None
    ) -> str:
        """Generate response from specified model"""
        
        # Check if model is in predefined list
        if model_name in self.AVAILABLE_MODELS:
            model_info = self.AVAILABLE_MODELS[model_name]
            
            if model_info["provider"] == "openrouter":
                return await self._generate_openrouter(model_name, system_prompt, user_message, context)
            elif model_info["provider"] == "custom":
                return await self._generate_custom(system_prompt, user_message, context)
            else:
                raise ValueError(f"Unknown provider: {model_info['provider']}")
        else:
            # Treat any unknown model as an OpenRouter model (supports custom/free models)
            return await self._generate_openrouter(model_name, system_prompt, user_message, context)
    
    async def _generate_openrouter(
        self,
        model_name: str,
        system_prompt: str,
        user_message: str,
        context: Optional[List[Dict]] = None
    ) -> str:
        """Generate using OpenRouter API with improved error handling"""
        
        # Validate API key first
        if not self._validate_api_key():
            raise Exception(f"API Key Error: {self.last_error}")
        
        # Build message list
        messages = [{"role": "system", "content": system_prompt}]
        
        if context:
            messages.extend(context)
        
        messages.append({"role": "user", "content": user_message})
        
        try:
            self.request_count += 1
            
            headers = {
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://github.com/daniswr",
                "X-Title": "Cyber Agent",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096
            }
            
            response = await self.client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=120.0
            )
            
            if response.status_code != 200:
                self.error_count += 1
                
                # Try to extract error message from response
                try:
                    error_data = response.json()
                    error_message = error_data.get("error", {}).get("message", str(error_data))
                except Exception:
                    error_message = response.text[:200]
                
                if response.status_code == 402:
                    error_msg = f"OpenRouter 402 Payment Required: Your account has insufficient credits. Please add credits to your OpenRouter account and try again."
                    self.last_error = error_msg
                    raise Exception(error_msg)
                elif response.status_code == 401:
                    error_msg = f"OpenRouter 401 Unauthorized: Invalid or expired API key."
                    self.last_error = error_msg
                    raise Exception(error_msg)
                elif response.status_code == 429:
                    error_msg = f"OpenRouter 429 Rate Limited: Too many requests. Please wait before retrying."
                    self.last_error = error_msg
                    raise Exception(error_msg)
                else:
                    error_msg = f"OpenRouter API {response.status_code}: {error_message}"
                    self.last_error = error_msg
                    raise Exception(error_msg)
            
            # Parse successful response
            data = response.json()
            
            # Validate response structure
            if "choices" not in data or len(data["choices"]) == 0:
                raise Exception("Invalid response structure from OpenRouter")
            
            content = data["choices"][0]["message"]["content"].strip()
            
            if not content:
                raise Exception("Empty response from OpenRouter")
            
            return content
            
        except httpx.TimeoutException:
            self.error_count += 1
            error_msg = "OpenRouter API timeout (120s)"
            self.last_error = error_msg
            raise Exception(error_msg)
        except httpx.ConnectError:
            self.error_count += 1
            error_msg = "No internet connection or cannot reach OpenRouter API"
            self.last_error = error_msg
            raise Exception(error_msg)
        except Exception as e:
            self.error_count += 1
            error_msg = f"System error: {type(e).__name__}: {str(e)[:100]}"
            self.last_error = error_msg
            raise
    
    async def _generate_custom(
        self,
        system_prompt: str,
        user_message: str,
        context: Optional[List[Dict]] = None
    ) -> str:
        """Generate using custom model endpoint"""
        
        if not settings.CUSTOM_MODEL_ENDPOINT:
            raise ValueError("Custom model endpoint not configured")
        
        messages = [{"role": "system", "content": system_prompt}]
        
        if context:
            messages.extend(context)
        
        messages.append({"role": "user", "content": user_message})
        
        try:
            response = await self.client.post(
                settings.CUSTOM_MODEL_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {settings.CUSTOM_MODEL_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={"messages": messages}
            )
            response.raise_for_status()
            data = response.json()
            # Adjust based on your custom model's response format
            return data.get("response", data.get("content", ""))
        except Exception as e:
            raise Exception(f"Custom model error: {str(e)}")
    
    async def chat(self, message: str) -> str:
        """Simple chat interface (uses default model)"""
        return await self.generate(
            "openai/gpt-4-turbo",
            "You are a helpful cyber security AI assistant.",
            message
        )
    
    async def test_connection(self, provider: str, model: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        """Test connection to AI model"""
        import time
        
        test_key = api_key or settings.OPENROUTER_API_KEY
        
        if not test_key or not test_key.strip():
            return {
                "status": "error",
                "message": "API key is not configured",
                "provider": provider,
                "model": model
            }
        
        if not test_key.startswith("sk-"):
            return {
                "status": "error",
                "message": "Invalid API key format (should start with 'sk-')",
                "provider": provider,
                "model": model
            }
        
        try:
            start_time = time.time()
            
            headers = {
                "Authorization": f"Bearer {test_key}",
                "HTTP-Referer": "https://github.com/performa-ai",
                "X-Title": "Performa API Test",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": "Say 'API connection successful' in 5 words or less."}],
                "max_tokens": 20
            }
            
            response = await self.client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            
            latency = int((time.time() - start_time) * 1000)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "message": "API connection successful",
                    "provider": provider,
                    "model": model,
                    "latency": f"{latency}ms",
                    "response": data.get("choices", [{}])[0].get("message", {}).get("content", "")
                }
            elif response.status_code == 402:
                return {
                    "status": "error",
                    "message": "Insufficient credits on OpenRouter account",
                    "provider": provider,
                    "model": model
                }
            elif response.status_code == 401:
                return {
                    "status": "error",
                    "message": "Invalid API key",
                    "provider": provider,
                    "model": model
                }
            else:
                error_data = response.json() if response.text else {}
                return {
                    "status": "error",
                    "message": f"API error {response.status_code}: {error_data.get('error', {}).get('message', 'Unknown error')}",
                    "provider": provider,
                    "model": model
                }
                
        except httpx.TimeoutException:
            return {
                "status": "error",
                "message": "Connection timeout (30s)",
                "provider": provider,
                "model": model
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection error: {str(e)}",
                "provider": provider,
                "model": model
            }
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
