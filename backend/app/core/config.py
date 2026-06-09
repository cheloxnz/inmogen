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
    REPLICATE_API_TOKEN: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_STARTER: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_SCALE: str = ""
    STRIPE_PRICE_PACK_10: str = ""
    STRIPE_PRICE_PACK_25: str = ""
    STRIPE_PRICE_PACK_50: str = ""
    STRIPE_PRICE_PACK_100: str = ""
    REFERRAL_CREDITS_REFERRER: int = 5   # créditos para quien refirió
    REFERRAL_CREDITS_NEW_USER: int = 2   # créditos extra para el nuevo usuario

    CLERK_SECRET_KEY: str
    CLERK_PUBLISHABLE_KEY: str = ""

    API_BASE_URL: str = "https://api.inmogen-ia.com"
    STATIC_DIR: str = "/opt/inmogen/backend/static"

    class Config:
        env_file = ".env"


settings = Settings()
