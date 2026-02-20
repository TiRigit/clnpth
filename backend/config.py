from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:aipassword@localhost:5432/postgres"
    db_schema: str = "clnpth"
    frontend_port: int = 5173
    n8n_url: str = "http://localhost:5678"
    n8n_webhook_token: str = ""
    deepl_api_key: str = ""
    deepl_api_url: str = "https://api-free.deepl.com/v2"
    mistral_api_key: str = ""
    mistral_model: str = "mistral-large-latest"
    runpod_api_key: str = ""
    runpod_endpoint_id: str = ""
    image_storage_path: str = "static/images"
    wp_url: str = "http://meinsite.local/wp-json/wp/v2"
    wp_user: str = ""
    wp_app_password: str = ""
    comfyui_url: str = "http://localhost:8188"

    # Feature flags
    feature_image: bool = True
    feature_translation: bool = True
    feature_social: bool = False
    feature_rss: bool = False
    feature_crosslinking: bool = False
    feature_bulk_input: bool = False

    model_config = {
        "env_file": "../.env",
        "env_prefix": "CLNPTH_",
        "extra": "ignore",
    }


settings = Settings()
