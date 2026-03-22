from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str
    nvidia_api_key: str
    nvidia_model: str = "moonshotai/kimi-k2-instruct"
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    supabase_jwt_secret: str = ""  # Only needed for HS256; RS256 uses JWKS endpoint

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
