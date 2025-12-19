from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # Kế thừa AbstractUser đã có sẵn username, email, password...
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    nickname = models.CharField(max_length=100, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True)