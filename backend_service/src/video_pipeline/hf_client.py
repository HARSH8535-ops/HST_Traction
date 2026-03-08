import os
import requests
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

class HuggingFaceClient:
    def __init__(self):
        self.api_key = os.environ.get('HUGGINGFACE_API_KEY')
        # Default model for image generation
        self.model_id = "stabilityai/stable-diffusion-xl-base-1.0"
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"

    def generate_image(self, prompt, aspect_ratio="16:9"):
        """
        Generate an image using Hugging Face Inference API.

        :param prompt: Text prompt for image generation
        :param aspect_ratio: Aspect ratio (e.g., "16:9" or "1:1")
        :return: Image bytes or None if generation fails
        """
        if not self.api_key:
            print("Warning: HUGGINGFACE_API_KEY not set")
            return None

        headers = {"Authorization": f"Bearer {self.api_key}"}

        # Optionally handle aspect ratio by modifying prompt or parameters if supported by model
        # Stable diffusion XL base doesn't natively take width/height via API inference easily
        # without dedicated endpoints, but we can try to pass them if allowed.
        width = 1024
        height = 576 if aspect_ratio == "16:9" else 1024

        payload = {
            "inputs": prompt,
            "parameters": {
                "width": width,
                "height": height
            }
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"Error generating image with Hugging Face: {e}")
            return None

    def generate_placeholder_image(self, text, width=1920, height=1080):
        """
        Generate a placeholder image with text.

        :param text: Text to display on the image
        :param width: Image width
        :param height: Image height
        :return: Image bytes
        """
        # Create a blank image
        img = Image.new('RGB', (width, height), color=(73, 109, 137))

        # Initialize drawing context
        d = ImageDraw.Draw(img)

        # Add text (using default font)
        d.text((10, 10), text, fill=(255, 255, 0))

        # Convert image to bytes
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()
