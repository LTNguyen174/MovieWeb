from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsOwnerOrReadOnly(BasePermission):
    """
    Quyền tùy chỉnh: Chỉ cho phép chủ sở hữu của một đối tượng được
    sửa hoặc xóa nó.
    Những người khác (kể cả khách) chỉ được xem (Read-only).
    """

    def has_permission(self, request, view):
        # Cho phép user đã xác thực thực hiện các action
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # SAFE_METHODS là ('GET', 'HEAD', 'OPTIONS') - tức là các request CHỈ ĐỌC
        if request.method in SAFE_METHODS:
            return True

        # Nếu request là 'PUT' hoặc 'DELETE' (viết),
        # chỉ cho phép nếu `obj.user` (chủ bình luận)
        # giống với `request.user` (người đang gửi request)
        
        # Đảm bảo đối tượng có thuộc tính 'user'
        if not hasattr(obj, 'user'):
            return False
            
        return obj.user == request.user
