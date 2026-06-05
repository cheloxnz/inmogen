from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "InmoGen API"
    DEBUG: bool = False
    PORT: int = 8003

    MONGODB_URL: str
    MONGODB_DB: str = "inmogen_prod"

    APIFY_TOKEN: str = ""
    SCRAPERAPI_KEY: str = ""
    HIGGSFIELD_API_KEY: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str = ""

    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
