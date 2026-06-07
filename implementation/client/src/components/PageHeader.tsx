// import MobileAside from "./MobileAside";

interface PageHeaderProps {
  title: string;
  about?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}

function PageHeader({ title, about, children, action }: PageHeaderProps) {
  return (
    <header className=" p-4">
      <div className="flex items-start justify-between">
        <div className="">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {about && <p className="text-sm mt-1">{about}</p>}
        </div>
        <div className="">
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
      <div className="">
        {children && <div className="mt-4">{children}</div>}
      </div>
    </header>
  );
}

export default PageHeader;
