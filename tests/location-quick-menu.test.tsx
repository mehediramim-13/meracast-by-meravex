import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocationQuickMenu } from "@/components/layout/location-quick-menu";
import { DEFAULT_PLACE } from "@/lib/constants";
import { useLocations } from "@/store/use-locations";
import { useUI } from "@/store/use-ui";
import type { Place } from "@/types/geo";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/i18n/provider", () => ({
  useI18n: () => ({ t: (key: string) => key, language: "en" as const }),
}));

vi.mock("@/hooks/use-format", () => ({
  useFormat: () => ({
    num: (value: number) => String(value),
    temp: (value: number) => `${value}°`,
    percent: (value: number) => `${Math.round(value)}%`,
  }),
}));

vi.mock("@/hooks/use-environment", () => ({
  useMediaQuery: () => false,
  useOnline: () => true,
  useHydrated: () => true,
  useNow: () => new Date("2026-10-23T12:00:00Z"),
}));

vi.mock("@/hooks/use-haptics", () => ({
  useHaptics: () => vi.fn(),
}));

vi.mock("@/hooks/use-geolocation", () => {
  const geolocation = {
    locate: vi.fn().mockResolvedValue(null),
    reset: vi.fn(),
  };
  return {
    useGeolocation: () => ({
      locate: geolocation.locate,
      status: "idle" as const,
      reset: geolocation.reset,
    }),
  };
});

vi.mock("@/hooks/use-weather", () => ({
  useGeocodeQuery: () => ({
    data: [
      {
        id: "geo-1",
        name: "Chattogram",
        country: "Bangladesh",
        countryCode: "BD",
        admin1: "Chattogram Division",
        latitude: 22.3569,
        longitude: 91.7832,
        timezone: "Asia/Dhaka",
      },
    ],
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useFavoriteSummariesQuery: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
}));

function city(name: string, latitude: number, longitude: number, id = name.toLowerCase()): Place {
  return {
    id,
    name,
    country: "Bangladesh",
    countryCode: "BD",
    admin1: "Dhaka Division",
    latitude,
    longitude,
    timezone: "Asia/Dhaka",
  };
}

const dhaka = city("Dhaka", 23.8103, 90.4125, "dhaka");
const sylhet = city("Sylhet", 24.8949, 91.8687, "sylhet");
const khulna = city("Khulna", 22.8456, 89.5403, "khulna");

function reset() {
  window.localStorage.clear();
  useLocations.setState({
    activePlace: DEFAULT_PLACE,
    favorites: [],
    recents: [],
    homePlaceId: null,
  });
  useUI.setState({ locationMenuOpen: true, searchOpen: false });
}

function Harness() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const open = useUI((state) => state.locationMenuOpen);
  const setOpen = useUI((state) => state.setLocationMenuOpen);

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        trigger
      </button>
      <LocationQuickMenu open={open} triggerRef={triggerRef} />
    </>
  );
}

function renderMenu() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("LocationQuickMenu", () => {
  beforeEach(() => {
    reset();
  });

  afterEach(() => {
    useUI.setState({ locationMenuOpen: false });
    push.mockClear();
  });

  it("focuses search, stays focused while typing and closes back to the trigger", async () => {
    const user = userEvent.setup();
    renderMenu();

    const input = screen.getByRole("combobox");
    await waitFor(() => expect(input).toHaveFocus());

    await user.type(input, "chattogram");
    expect(input).toHaveFocus();
    expect(input).toHaveValue("chattogram");

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(useUI.getState().locationMenuOpen).toBe(false);
    await waitFor(() => expect(screen.getByRole("button", { name: "trigger" })).toHaveFocus());
  });

  it("switches to a favorite, records it and routes like the full search", async () => {
    const user = userEvent.setup();
    useLocations.setState({ favorites: [{ ...dhaka, addedAt: 1 }] });
    renderMenu();

    await user.click(screen.getByText("Dhaka"));
    expect(useLocations.getState().activePlace.id).toBe("dhaka");
    expect(useUI.getState().locationMenuOpen).toBe(false);
    expect(push).toHaveBeenCalledWith(expect.stringContaining("/?lat=23.8103"));
  });

  it("removes a favorite from its filled heart", async () => {
    const user = userEvent.setup();
    useLocations.setState({ favorites: [{ ...dhaka, addedAt: 1 }] });
    renderMenu();

    await user.click(screen.getByRole("button", { name: "removeFavorite" }));
    expect(useLocations.getState().favorites).toHaveLength(0);
  });

  it("adds a search result with its outline heart", async () => {
    const user = userEvent.setup();
    renderMenu();

    const input = screen.getByRole("combobox");
    await user.type(input, "ch");
    await waitFor(() => expect(screen.getByText("Chattogram")).toBeInTheDocument(), {
      timeout: 1500,
    });

    await user.click(screen.getByRole("button", { name: "addFavorite" }));
    expect(useLocations.getState().favorites[0]?.name).toBe("Chattogram");
    expect(input).toHaveValue("ch");
  });

  it("sets one home and keeps it first", async () => {
    const user = userEvent.setup();
    useLocations.setState({ favorites: [{ ...dhaka, addedAt: 1 }, { ...sylhet, addedAt: 1 }] });
    renderMenu();

    await user.click(screen.getAllByRole("button", { name: "quickSetHome" })[0] as HTMLElement);
    expect(useLocations.getState().homePlaceId).toBe("dhaka");
    expect(useLocations.getState().favorites[0]?.id).toBe("dhaka");
  });

  it("reorders a non-home favorite with the move down control", async () => {
    const user = userEvent.setup();
    useLocations.setState({
      favorites: [
        { ...dhaka, addedAt: 1 },
        { ...sylhet, addedAt: 1 },
        { ...khulna, addedAt: 1 },
      ],
      homePlaceId: "dhaka",
    });
    renderMenu();

    const moveDown = screen.getAllByRole("button", { name: "quickMoveDown" });
    await user.click(moveDown[1] as HTMLElement);

    expect(useLocations.getState().favorites.map((favorite) => favorite.id)).toEqual([
      "dhaka",
      "khulna",
      "sylhet",
    ]);
  });
});
