"""Password complexity validators for CrisisLens."""
import re
from django.core.exceptions import ValidationError


class UppercaseValidator:
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError('Password must contain at least one uppercase letter.')
    def get_help_text(self):
        return 'Must contain at least one uppercase letter.'


class DigitValidator:
    def validate(self, password, user=None):
        if not re.search(r'\d', password):
            raise ValidationError('Password must contain at least one digit.')
    def get_help_text(self):
        return 'Must contain at least one digit.'


class SpecialCharValidator:
    def validate(self, password, user=None):
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', password):
            raise ValidationError('Password must contain at least one special character.')
    def get_help_text(self):
        return 'Must contain at least one special character (!@#$%^&*...).'
