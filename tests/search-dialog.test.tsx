import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchDialog } from "@/components/search/search-dialog";
import { useUI } from "@/store/use-ui";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/i18n/provider", () => ({
  useI18n: () => ({ t: (key: string) => key, language: "en" as const }),
}));

vi.mock("@/hooks/use-weather", () => ({
  queryKeys: {
    geocode: (query: string, language: string) => ["geocode", language, query],
  },
  useGeocodeQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-geolocation", () => ({
  useGeolocation: () => ({
    locate: vi.fn().mockResolvedValue(null),
    status: "idle" as const,
    reset: vi.fn(),
  }),
}));

beforeEach(() => {
  useUI.setState({ searchOpen: true });
});

afterEach(() => {
  useUI.setState({ searchOpen: false });
});

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SearchDialog />
    </QueryClientProvider>,
  );
}

describe("SearchDialog focus", () => {
  it("keeps focus and preserves the full query while typing", async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "c");
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "Close" })).not.toHaveFocus();

    await user.type(input, "hattogram");
    expect(input).toHaveFocus();
    expect(input).toHaveValue("chattogram");
  });

  it("clears the query without moving focus out of the input", async () => {
    const user = userEvent.setup();
    renderDialog();

    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "dhaka");
    expect(input).toHaveValue("dhaka");

    await user.click(screen.getByRole("button", { name: "clear" }));

    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });
});
