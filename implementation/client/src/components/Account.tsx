import { Link } from "react-router-dom";

function Account({
  image = "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff",
  username = "guest",
  fullname = "Guest User",
  to = "#",
}) {
  return (
    <Link to={to} className="flex items-center gap-3">
      {/* Avatar */}
      <img
        src={image}
        alt={username}
        className="w-10 h-10 rounded-full object-cover"
      />

      {/* Text only not on tablet */}
      <div className="flex flex-col leading-tight md:hidden lg:flex">
        <span className="font-medium text-sm text-white">{fullname}</span>
        <span className="text-xs text-gray-400">@{username}</span>
      </div>
    </Link>
  );
}

export default Account;
