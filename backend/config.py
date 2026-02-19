from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:aipassword@localhost:5432/postgres"
    db_schema: str = "clnpth"
    frontend_port: int = 5173
    n8n_url: str = "http://localhost:5678"
    n8n_webhook_token: str = ""
    wp_url: str = "http://meinsite.local/wp-json/wp/v2"
    comfyui_url: str = "http://localhost:8188"

    model_config = {
        "env_file": "../.env",
        "env_prefix": "CLNPTH_",
        "extra": "ignore",
    }


settings = Settings()
