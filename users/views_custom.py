from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers_custom import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
