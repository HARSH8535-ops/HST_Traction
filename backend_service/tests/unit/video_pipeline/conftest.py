import sys
from unittest.mock import MagicMock

# Mock missing modules so the handlers can be imported
sys.modules['validation'] = MagicMock()
sys.modules['scene_parser'] = MagicMock()
sys.modules['hf_client'] = MagicMock()
sys.modules['video_assembler'] = MagicMock()
