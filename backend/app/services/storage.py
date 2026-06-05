"""Upload creatives to Cloudinary and return public URLs."""
import cloudinary
import cloudinary.uploader
from io import BytesIO
from app.core.config import settings


def init_cloudinary():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )


async def upload_creative(image_bytes: bytes, public_id: str) -> str:
    result = cloudinary.uploader.upload(
        BytesIO(image_bytes),
        public_id=public_id,
        folder="inmogen/creatives",
        resource_type="image",
        format="jpg",
    )
    return result["secure_url"]


async def upload_zip(zip_bytes: bytes, public_id: str) -> str:
    result = cloudinary.uploader.upload(
        BytesIO(zip_bytes),
        public_id=public_id,
        folder="inmogen/zips",
        resource_type="raw",
    )
    return result["secure_url"]
