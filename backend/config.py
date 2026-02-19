from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ai_user:ai_password@localhost:5432/ai_projekt"
    db_schema: str = "clnpth"
    frontend_port: int = 5173
    n8n_url: str = "http://localhost:5678"
    wp_url: str = "http://meinsite.local/wp-json/wp/v2"
    comfyui_url: str = "http://localhost:8188"

    class Config:
        env_file = ".env"
        env_prefix = "CLNPTH_"


settings = Settings()
