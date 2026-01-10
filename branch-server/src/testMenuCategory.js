import { createCategory, changeCategoryAvailability } from "./menu/menuCategoryService.js";
import { getStaffById } from "./staff/staffRepository.js";

const owner = getStaffById("5c54a7db-1075-4132-87c2-df24c4e5697a");
const manager = getStaffById("e89ee11f-ff7b-45f8-9125-15c80b760dad");
const waiter = getStaffById("b8297eed-c317-4dc4-ba4e-1f670e600132");

const cat1 = createCategory({
    name: "Pizzas",
    sortOrder: 1,
    actorId: owner.id
})

// const cat = createCategory({
//     name: "pizzas",
//     sortOrder: 1,
//     actorId: owner.id
// })

const cat2 = createCategory({
    name: "Sides",
    sortOrder: 2,
    actorId: manager.id
})

const cat3 = createCategory({
    name: "Drinks",
    sortOrder: 3,
    actorId: owner.id,
});

console.log(cat1, cat1.id)

changeCategoryAvailability({
    categoryId: cat1.id,
    available: false,
    actorId: owner.id,
});

changeCategoryAvailability({
    categoryId: cat2.id,
    available: false,
    actorId: manager.id,
});

changeCategoryAvailability({
    categoryId: cat2.id,
    available: true,
    actorId: manager.id,
});

changeCategoryAvailability({
    categoryId: cat1.id,
    available: false,
    actorId: manager.id,
});

changeCategoryAvailability({
    categoryId: cat1.id,
    available: true,
    actorId: manager.id,
});

