from django.contrib import admin
from .models import Movie, Category, Rating, Comment, Country, Actor

admin.site.register(Movie)
admin.site.register(Category)
admin.site.register(Rating)
admin.site.register(Comment)
admin.site.register(Country)
admin.site.register(Actor)