import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils";
import { UserInfoDisplay } from "@/components/layout/UserInfoDisplay";

const TEST_NAME = "테스트 유저";
const TEST_EMAIL = "test@test.com";

describe("UserInfoDisplay", () => {
  it("이름이 제공되면 이름이 표시됨", () => {
    render(<UserInfoDisplay name={TEST_NAME} email={TEST_EMAIL} />);
    expect(screen.getByText(TEST_NAME)).toBeInTheDocument();
  });

  it("이름 없이 이메일만 제공되면 이메일이 표시됨", () => {
    render(<UserInfoDisplay email={TEST_EMAIL} />);
    expect(screen.getByText(TEST_EMAIL)).toBeInTheDocument();
  });

  it("이름과 이메일 모두 제공되면 둘 다 표시됨", () => {
    render(<UserInfoDisplay name={TEST_NAME} email={TEST_EMAIL} />);
    expect(screen.getByText(TEST_NAME)).toBeInTheDocument();
    expect(screen.getByText(TEST_EMAIL)).toBeInTheDocument();
  });

  it("이름만 있고 이메일이 없으면 이메일 미표시", () => {
    render(<UserInfoDisplay name={TEST_NAME} />);
    expect(screen.getByText(TEST_NAME)).toBeInTheDocument();
    expect(screen.queryByText(TEST_EMAIL)).not.toBeInTheDocument();
  });
});
