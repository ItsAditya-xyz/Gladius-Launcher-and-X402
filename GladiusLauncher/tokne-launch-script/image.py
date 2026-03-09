import os

from dotenv import load_dotenv

from function import upload_image_to_arena

TEST_IMAGE_URL = "https://pbs.twimg.com/media/HAiqiRsX0AAfF8C?format=jpg&name=medium"


def main() -> int:
    load_dotenv()

    arena_jwt = os.getenv("ARENA_JWT", "").strip()
    if not arena_jwt:
        print("Missing ARENA_JWT")
        return 1

    image_url = os.getenv("TEST_IMAGE_URL", "").strip() or TEST_IMAGE_URL
    if not image_url:
        print("Missing TEST_IMAGE_URL (env) or TEST_IMAGE_URL global in image.py")
        return 1

    info = upload_image_to_arena(image_url, arena_jwt)
    print("Upload result:")
    print(info)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
