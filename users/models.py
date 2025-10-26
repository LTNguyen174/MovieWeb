from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Kế thừa AbstractUser đã có sẵn username, email, password...
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    # Bạn có thể thêm các trường khác như date_of_birth