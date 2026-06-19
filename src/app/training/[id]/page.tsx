import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser, atLeast } from "@/lib/auth";
import { getCourseDetail } from "@/lib/courses";
import { CourseDetailClient } from "@/components/CourseDetailClient";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return <div className="text-[#726973]">Sign in to view this course.</div>;

  const course = await getCourseDetail(id);
  if (!course) notFound();

  const canEdit = atLeast(user.role, Role.STORE_MANAGER);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/training" className="flex items-center gap-1.5 font-medium text-[#726973] hover:text-[#440E48]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Training
        </Link>
        <span className="text-[#A19BA2]">/</span>
        <span className="truncate font-medium text-[#140516] max-w-[280px] sm:max-w-none">{course.title}</span>
      </div>

      <CourseDetailClient course={course} canEdit={canEdit} />
    </div>
  );
}
